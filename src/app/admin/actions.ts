"use server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";
import { capiForStatus, retryFailed, sendCapi, verifyPixels } from "@/lib/capi";
import { redirect } from "next/navigation";
import type { OrderStatus, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { SESSION_COOKIE, signSession } from "@/lib/auth";
import { logActivity, requireAdmin } from "@/lib/session";
import { getSetting, saveSetting, type AllSettings } from "@/lib/settings";
import { DEFAULT_LANDING_CONTENT, RESERVED_SLUGS, mergeLandingContent, type LandingContent } from "@/lib/settings-defaults";
import { rateLimit, clientInfo } from "@/lib/request";
import { smsForStatus, sendSms } from "@/lib/notify";
import { mapSteadfast, steadfastCreate, steadfastStatus } from "@/lib/steadfast";
import type { Section } from "@/lib/permissions";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const opt = (fd: FormData, k: string) => str(fd, k) || null;
const num = (fd: FormData, k: string) => (str(fd, k) === "" ? null : Number(str(fd, k)));
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/(^-|-$)/g, "");

function bustCatalog() {
  revalidateTag("catalog");
  revalidateTag("landing");
  revalidatePath("/", "layout");
}

// ── Auth ──────────────────────────────────────────────
export async function loginAction(_: unknown, fd: FormData) {
  const { ip } = await clientInfo();
  if (!rateLimit(`login:${ip}`, 8, 15 * 60 * 1000)) return { error: "Too many attempts. Try again in 15 minutes." };
  const email = str(fd, "email").toLowerCase();
  const admin = await db.admin.findUnique({ where: { email } }).catch(() => null);
  if (!admin || !admin.active || !(await bcrypt.compare(str(fd, "password"), admin.password))) return { error: "Invalid email or password" };
  const token = await signSession({ id: admin.id, email: admin.email, name: admin.name, role: admin.role });
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 7 * 86400 });
  await db.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  await logActivity(admin, "Logged in", undefined, { ip });
  redirect("/admin");
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

// ── Orders ────────────────────────────────────────────
async function applyStatus(orderId: string, status: OrderStatus, by: string, note?: string | null, extra: { courier?: string | null; trackingCode?: string | null } = {}) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return null;
  await db.$transaction(async (tx) => {
    const wasActive = !["CANCELLED", "RETURNED"].includes(order.status);
    const nowInactive = ["CANCELLED", "RETURNED"].includes(status);
    if (wasActive && nowInactive) for (const i of order.items) await tx.product.update({ where: { id: i.productId }, data: { stock: { increment: i.quantity } } });
    if (!wasActive && !nowInactive) for (const i of order.items) await tx.product.update({ where: { id: i.productId }, data: { stock: { decrement: i.quantity } } });
    await tx.order.update({ where: { id: orderId }, data: { status, ...extra } });
    if (status !== order.status || note) await tx.orderStatusLog.create({ data: { orderId, status, note, by } });
  });
  if (status !== order.status) {
    smsForStatus({ ...order, trackingCode: extra.trackingCode ?? order.trackingCode }, status).catch(() => {});
    after(() => capiForStatus(order, status));
  }
  return order;
}

export async function updateOrderStatus(fd: FormData) {
  const me = await requireAdmin("orders");
  const id = str(fd, "id");
  const status = str(fd, "status") as OrderStatus;
  const o = await applyStatus(id, status, me.name, opt(fd, "note"), { courier: opt(fd, "courier"), trackingCode: opt(fd, "trackingCode") });
  if (opt(fd, "adminNote") !== undefined) await db.order.update({ where: { id }, data: { adminNote: opt(fd, "adminNote") } });
  await logActivity(me, `Order ${o?.orderNo} → ${status}`, o?.orderNo);
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
}

export async function bulkOrders(fd: FormData) {
  const me = await requireAdmin("orders");
  const ids = fd.getAll("ids").map(String).filter(Boolean);
  const action = str(fd, "bulk");
  if (!ids.length) return;
  if (action === "print") redirect(`/admin/orders/print?ids=${ids.join(",")}`);
  if (action === "steadfast") {
    let ok = 0;
    for (const id of ids) {
      const o = await db.order.findUnique({ where: { id } });
      if (!o || o.consignmentId) continue;
      try {
        const r = await steadfastCreate(o);
        await db.order.update({ where: { id }, data: { consignmentId: r.consignmentId, trackingCode: r.trackingCode, courier: "Steadfast" } });
        await applyStatus(id, "SHIPPED", me.name, "Sent to Steadfast", { courier: "Steadfast", trackingCode: r.trackingCode });
        ok++;
      } catch (e) {
        await logActivity(me, `Steadfast failed for ${o.orderNo}: ${(e as Error).message}`, o.orderNo);
      }
    }
    await logActivity(me, `Bulk sent ${ok}/${ids.length} orders to Steadfast`);
  } else if (action) {
    for (const id of ids) await applyStatus(id, action as OrderStatus, me.name, "Bulk update");
    await logActivity(me, `Bulk ${ids.length} orders → ${action}`);
  }
  revalidatePath("/admin/orders");
}

export async function sendToSteadfast(fd: FormData) {
  const me = await requireAdmin("orders");
  const id = str(fd, "id");
  const o = await db.order.findUnique({ where: { id } });
  if (!o) return;
  try {
    const r = await steadfastCreate(o);
    await db.order.update({ where: { id }, data: { consignmentId: r.consignmentId, trackingCode: r.trackingCode, courier: "Steadfast" } });
    await applyStatus(id, "SHIPPED", me.name, `Steadfast consignment ${r.consignmentId}`, { courier: "Steadfast", trackingCode: r.trackingCode });
    await logActivity(me, `Sent ${o.orderNo} to Steadfast`, o.orderNo);
  } catch (e) {
    await db.orderStatusLog.create({ data: { orderId: id, status: o.status, note: `Steadfast error: ${(e as Error).message}`, by: me.name } });
  }
  revalidatePath(`/admin/orders/${id}`);
}

export async function syncSteadfast(fd: FormData) {
  const me = await requireAdmin("orders");
  const id = str(fd, "id");
  const o = await db.order.findUnique({ where: { id } });
  if (!o?.consignmentId) return;
  try {
    const s = await steadfastStatus(o.consignmentId);
    const mapped = mapSteadfast(s);
    if (mapped && mapped !== o.status) await applyStatus(id, mapped, me.name, `Steadfast: ${s}`);
    else await db.orderStatusLog.create({ data: { orderId: id, status: o.status, note: `Steadfast status: ${s}`, by: me.name } });
  } catch (e) {
    await db.orderStatusLog.create({ data: { orderId: id, status: o.status, note: `Steadfast error: ${(e as Error).message}`, by: me.name } });
  }
  revalidatePath(`/admin/orders/${id}`);
}

export async function deleteOrder(fd: FormData) {
  const me = await requireAdmin("orders");
  const o = await db.order.delete({ where: { id: str(fd, "id") } });
  await logActivity(me, `Deleted order ${o.orderNo}`, o.orderNo);
  redirect("/admin/orders");
}

// ── Blocklist / customers ─────────────────────────────
export async function addBlock(fd: FormData) {
  const me = await requireAdmin("customers" as Section);
  const type = str(fd, "type") === "ip" ? "ip" : "phone";
  const value = str(fd, "value");
  if (!value) return;
  await db.blocklist.upsert({ where: { type_value: { type, value } }, create: { type, value, reason: opt(fd, "reason") }, update: { reason: opt(fd, "reason") } });
  await logActivity(me, `Blocked ${type} ${value}`, value);
  revalidatePath("/admin/fraud");
  revalidatePath("/admin/customers");
  const back = str(fd, "back");
  if (back) revalidatePath(back);
}

export async function removeBlock(fd: FormData) {
  const me = await requireAdmin("customers");
  const b = await db.blocklist.delete({ where: { id: str(fd, "id") } });
  await logActivity(me, `Unblocked ${b.type} ${b.value}`, b.value);
  revalidatePath("/admin/fraud");
  revalidatePath("/admin/customers");
}

// ── Products & categories ─────────────────────────────
export async function saveProduct(fd: FormData) {
  const me = await requireAdmin("products");
  const id = str(fd, "id");
  const name = str(fd, "name");
  const data = {
    name,
    nameBn: opt(fd, "nameBn"),
    slug: slugify(str(fd, "slug") || name) || `product-${Date.now()}`,
    tagline: opt(fd, "tagline"),
    description: opt(fd, "description"),
    price: num(fd, "price") ?? 0,
    comparePrice: num(fd, "comparePrice"),
    weight: opt(fd, "weight"),
    image: str(fd, "image") || "/brand/logo-card-t.png",
    gallery: str(fd, "gallery").split("\n").map((s) => s.trim()).filter(Boolean),
    stock: num(fd, "stock") ?? 0,
    sortOrder: num(fd, "sortOrder") ?? 0,
    active: fd.get("active") === "on",
    featured: fd.get("featured") === "on",
    isAddon: fd.get("isAddon") === "on",
    comboPrice: num(fd, "comboPrice"),
    addonNote: opt(fd, "addonNote"),
    categoryId: opt(fd, "categoryId"),
  };
  if (id) await db.product.update({ where: { id }, data });
  else await db.product.create({ data });
  await logActivity(me, `${id ? "Updated" : "Created"} product ${name}`, data.slug);
  bustCatalog();
  redirect("/admin/products");
}

export async function deleteProduct(fd: FormData) {
  const me = await requireAdmin("products");
  const id = str(fd, "id");
  const used = await db.orderItem.count({ where: { productId: id } });
  const p = used ? await db.product.update({ where: { id }, data: { active: false } }) : await db.product.delete({ where: { id } });
  await logActivity(me, `${used ? "Hid" : "Deleted"} product ${p.name}`);
  bustCatalog();
  revalidatePath("/admin/products");
}

export async function saveCategory(fd: FormData) {
  const me = await requireAdmin("products");
  const id = str(fd, "id");
  const name = str(fd, "name");
  const data = { name, nameBn: opt(fd, "nameBn"), slug: slugify(str(fd, "slug") || name) || `cat-${Date.now()}`, image: opt(fd, "image"), sortOrder: num(fd, "sortOrder") ?? 0, active: fd.get("active") !== "off" };
  if (id) await db.category.update({ where: { id }, data });
  else await db.category.create({ data });
  await logActivity(me, `${id ? "Updated" : "Created"} category ${name}`);
  bustCatalog();
  revalidatePath("/admin/categories");
}

export async function deleteCategory(fd: FormData) {
  const me = await requireAdmin("products");
  const c = await db.category.delete({ where: { id: str(fd, "id") } });
  await logActivity(me, `Deleted category ${c.name}`);
  bustCatalog();
  revalidatePath("/admin/categories");
}

// ── Landing pages ─────────────────────────────────────
export async function createLanding(_: unknown, fd: FormData) {
  const me = await requireAdmin("landing");
  const slug = slugify(str(fd, "slug"));
  if (!slug) return { error: "Slug দিন (শুধু a-z, 0-9, -)" };
  if (RESERVED_SLUGS.has(slug)) return { error: `"${slug}" সংরক্ষিত — অন্য নাম দিন` };
  if (await db.landingPage.findUnique({ where: { slug } })) return { error: "এই slug আগে থেকেই আছে" };
  const productId = str(fd, "productId");
  if (!productId) return { error: "মেইন পণ্য সিলেক্ট করুন" };
  const copyFrom = str(fd, "copyFrom");
  let content: LandingContent = DEFAULT_LANDING_CONTENT;
  let addonIds: string[] = (await db.product.findMany({ where: { isAddon: true, active: true }, select: { id: true } })).map((p) => p.id);
  if (copyFrom) {
    const src = await db.landingPage.findUnique({ where: { id: copyFrom } });
    if (src) {
      content = mergeLandingContent(src.content);
      addonIds = src.addonIds;
    }
  } else {
    const { getSetting } = await import("@/lib/settings");
    const [copy, up] = await Promise.all([getSetting("landing"), getSetting("upsell")]);
    content = { ...DEFAULT_LANDING_CONTENT, copy, combo: { ...DEFAULT_LANDING_CONTENT.combo, ...up } };
  }
  const lp = await db.landingPage.create({ data: { slug, title: str(fd, "title") || slug, productId, addonIds, content: content as object } });
  await logActivity(me, `Created landing page /${slug}`, slug);
  revalidateTag("landing");
  redirect(`/admin/landing/${lp.id}`);
}

export async function saveLanding(id: string, data: { slug: string; title: string; active: boolean; productId: string; extraIds: string[]; addonIds: string[]; pixelId: string; seoTitle: string; seoDesc: string; content: LandingContent }) {
  const me = await requireAdmin("landing");
  const slug = slugify(data.slug);
  if (!slug || RESERVED_SLUGS.has(slug)) return { error: "এই slug ব্যবহার করা যাবে না" };
  const clash = await db.landingPage.findFirst({ where: { slug, id: { not: id } } });
  if (clash) return { error: "এই slug আগে থেকেই আছে" };
  const old = await db.landingPage.findUnique({ where: { id } });
  await db.landingPage.update({
    where: { id },
    data: { slug, title: data.title, active: data.active, productId: data.productId, extraIds: data.extraIds, addonIds: data.addonIds, pixelId: data.pixelId || null, seoTitle: data.seoTitle || null, seoDesc: data.seoDesc || null, content: data.content as object },
  });
  await logActivity(me, `Updated landing page /${slug}`, slug);
  revalidateTag("landing");
  revalidatePath(`/${slug}`);
  if (old && old.slug !== slug) revalidatePath(`/${old.slug}`);
  return { ok: true, slug };
}

export async function duplicateLanding(fd: FormData) {
  const me = await requireAdmin("landing");
  const src = await db.landingPage.findUnique({ where: { id: str(fd, "id") } });
  if (!src) return;
  let slug = `${src.slug}-copy`;
  for (let i = 2; await db.landingPage.findUnique({ where: { slug } }); i++) slug = `${src.slug}-copy${i}`;
  const lp = await db.landingPage.create({
    data: { slug, title: `${src.title} (copy)`, active: false, productId: src.productId, extraIds: src.extraIds, addonIds: src.addonIds, content: src.content as object, pixelId: src.pixelId, seoTitle: src.seoTitle, seoDesc: src.seoDesc },
  });
  await logActivity(me, `Duplicated /${src.slug} → /${slug}`, slug);
  revalidateTag("landing");
  redirect(`/admin/landing/${lp.id}`);
}

export async function deleteLanding(fd: FormData) {
  const me = await requireAdmin("landing");
  const lp = await db.landingPage.delete({ where: { id: str(fd, "id") } });
  await logActivity(me, `Deleted landing page /${lp.slug}`, lp.slug);
  revalidateTag("landing");
  revalidatePath(`/${lp.slug}`);
  redirect("/admin/landing");
}

export async function saveGuide(fd: FormData) {
  const me = await requireAdmin("landing");
  const id = str(fd, "id");
  const title = str(fd, "title");
  const data = { title, slug: slugify(str(fd, "slug") || title) || `page-${Date.now()}`, content: str(fd, "content"), active: fd.get("active") === "on" };
  if (id) await db.guidePage.update({ where: { id }, data });
  else await db.guidePage.create({ data });
  await logActivity(me, `${id ? "Updated" : "Created"} guide page /guide/${data.slug}`);
  revalidateTag("guide");
  redirect("/admin/guides");
}

export async function deleteGuide(fd: FormData) {
  const me = await requireAdmin("landing");
  const g = await db.guidePage.delete({ where: { id: str(fd, "id") } });
  await logActivity(me, `Deleted guide page ${g.slug}`);
  revalidateTag("guide");
  revalidatePath("/admin/guides");
}

// ── Marketing: reviews, coupons, drafts ───────────────
export async function saveReview(fd: FormData) {
  const me = await requireAdmin("marketing");
  await db.review.create({ data: { name: str(fd, "name"), location: opt(fd, "location"), rating: Math.min(5, Math.max(1, num(fd, "rating") ?? 5)), text: str(fd, "text") } });
  await logActivity(me, `Added review by ${str(fd, "name")}`);
  bustCatalog();
  revalidatePath("/admin/reviews");
}
export async function toggleReview(fd: FormData) {
  await requireAdmin("marketing");
  const r = await db.review.findUnique({ where: { id: str(fd, "id") } });
  if (r) await db.review.update({ where: { id: r.id }, data: { active: !r.active } });
  bustCatalog();
  revalidatePath("/admin/reviews");
}
export async function deleteReview(fd: FormData) {
  await requireAdmin("marketing");
  await db.review.delete({ where: { id: str(fd, "id") } });
  bustCatalog();
  revalidatePath("/admin/reviews");
}

export async function saveCoupon(fd: FormData) {
  const me = await requireAdmin("marketing");
  const id = str(fd, "id");
  const data = {
    code: str(fd, "code").toUpperCase().replace(/\s/g, ""),
    type: str(fd, "type") === "PERCENT" ? "PERCENT" : "FLAT",
    value: num(fd, "value") ?? 0,
    minOrder: num(fd, "minOrder") ?? 0,
    maxDiscount: num(fd, "maxDiscount"),
    usageLimit: num(fd, "usageLimit"),
    expiresAt: str(fd, "expiresAt") ? new Date(str(fd, "expiresAt")) : null,
    active: fd.get("active") === "on",
  };
  if (!data.code) return;
  if (id) await db.coupon.update({ where: { id }, data });
  else await db.coupon.create({ data });
  await logActivity(me, `${id ? "Updated" : "Created"} coupon ${data.code}`);
  revalidatePath("/admin/coupons");
}
export async function deleteCoupon(fd: FormData) {
  const me = await requireAdmin("marketing");
  const c = await db.coupon.delete({ where: { id: str(fd, "id") } });
  await logActivity(me, `Deleted coupon ${c.code}`);
  revalidatePath("/admin/coupons");
}

export async function deleteDraft(fd: FormData) {
  await requireAdmin("orders");
  await db.draftOrder.delete({ where: { id: str(fd, "id") } });
  revalidatePath("/admin/incomplete");
}

// ── Settings ──────────────────────────────────────────
const SETTING_SECTION: Record<keyof AllSettings, Section> = {
  site: "system",
  delivery: "payments",
  tracking: "system",
  fraud: "system",
  landing: "landing",
  upsell: "landing",
  mainSite: "mainsite",
  payments: "payments",
  sms: "system",
  email: "system",
  invoice: "system",
  courier: "payments",
  thankYou: "mainsite",
};

export async function saveSettingsAction<K extends keyof AllSettings>(key: K, value: AllSettings[K]) {
  const me = await requireAdmin(SETTING_SECTION[key]);
  await saveSetting(key, value);
  await logActivity(me, `Updated ${key} settings`);
  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Facebook Pixel & Conversions API ──────────────────
export type PixelInput = { id: string; label: string; token: string; prevId: string; removeToken: boolean };
export type PixelSettingsInput = Omit<AllSettings["tracking"], "pixels"> & { pixels: PixelInput[] };

/** Tokens never travel to the browser: an empty token field keeps the saved one. */
export async function savePixelSettings(v: PixelSettingsInput) {
  const me = await requireAdmin("system");
  const old = await getSetting("tracking");
  const pixels = v.pixels
    .map((p) => ({ ...p, id: p.id.replace(/\D/g, "") }))
    .filter((p) => p.id)
    .slice(0, 5)
    .map((p) => {
      const prev = old.pixels.find((x) => x.id === (p.prevId || p.id));
      return { id: p.id, label: p.label.trim().slice(0, 60), token: p.removeToken ? "" : p.token.trim() || prev?.token || "" };
    });
  if (new Set(pixels.map((p) => p.id)).size !== pixels.length) return { error: "The same Pixel ID is added twice" };
  const graphVersion = /^v\d{2}\.\d$/.test(v.graphVersion.trim()) ? v.graphVersion.trim() : "v23.0";
  await saveSetting("tracking", {
    pixels,
    browserEnabled: !!v.browserEnabled,
    capiEnabled: !!v.capiEnabled,
    serverPageView: !!v.serverPageView,
    fbTestEventCode: v.fbTestEventCode.trim(),
    graphVersion,
    events: v.events,
    purchaseTrigger: v.purchaseTrigger,
    purchaseValue: v.purchaseValue,
    ga4Id: v.ga4Id.trim(),
    gtmId: v.gtmId.trim(),
    tiktokPixelId: v.tiktokPixelId.trim(),
  });
  await logActivity(me, "Updated Facebook Pixel settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function verifyPixelsAction() {
  await requireAdmin("system");
  return verifyPixels();
}

export async function sendTestPurchaseAction(code: string) {
  await requireAdmin("system");
  const { ip, userAgent } = await clientInfo();
  const r = await sendCapi({
    force: true,
    testCode: code.trim(),
    eventName: "Purchase",
    eventId: `test-${Date.now()}`,
    ip,
    userAgent,
    orderNo: "TEST",
    source: "shop",
    user: { phone: "01700000000", name: "Test Customer", externalId: "test" },
    custom: { currency: "BDT", value: 999, content_type: "product", content_ids: ["test"], num_items: 1, order_id: "TEST" },
  });
  revalidatePath("/admin/pixel");
  if ("skipped" in r) return { error: r.skipped === "no pixel" ? "Add a Pixel ID with a Conversions API token first" : String(r.skipped) };
  if ("results" in r && r.results) return { ok: r.ok, results: r.results };
  return { error: "Could not send" };
}

export async function retryFailedCapiAction() {
  await requireAdmin("system");
  const r = await retryFailed(undefined, 200);
  revalidatePath("/admin/pixel");
  return r;
}

export async function testSms(phone: string) {
  await requireAdmin("system");
  return sendSms(phone, "Qura Food test SMS ✓");
}

// ── Users & roles ─────────────────────────────────────
export async function saveUser(_: unknown, fd: FormData) {
  const me = await requireAdmin("system");
  const id = str(fd, "id");
  const email = str(fd, "email").toLowerCase();
  const password = str(fd, "password");
  const role = (["ADMIN", "MANAGER", "STAFF"].includes(str(fd, "role")) ? str(fd, "role") : "STAFF") as Role;
  const permissions = fd.getAll("permissions").map(String);
  if (!email || !str(fd, "name")) return { error: "Name and email required" };
  if (!id && password.length < 8) return { error: "Password must be at least 8 characters" };
  if (id === me.id && role !== "ADMIN") return { error: "You cannot remove your own admin role" };
  const data = { name: str(fd, "name"), email, role, permissions, active: fd.get("active") === "on" || id === me.id, ...(password ? { password: await bcrypt.hash(password, 10) } : {}) };
  try {
    if (id) await db.admin.update({ where: { id }, data });
    else await db.admin.create({ data: { ...data, password: data.password! } });
  } catch {
    return { error: "Email already used" };
  }
  await logActivity(me, `${id ? "Updated" : "Created"} user ${email} (${role})`);
  revalidatePath("/admin/users");
  return { ok: "Saved" };
}

export async function changePassword(_: unknown, fd: FormData) {
  const me = await requireAdmin();
  const next = str(fd, "next");
  if (next.length < 8) return { error: "New password must be at least 8 characters" };
  const admin = await db.admin.findUnique({ where: { id: me.id } });
  if (!admin || !(await bcrypt.compare(str(fd, "current"), admin.password))) return { error: "Current password is wrong" };
  await db.admin.update({ where: { id: me.id }, data: { password: await bcrypt.hash(next, 10) } });
  await logActivity(me, "Changed own password");
  return { ok: "Password updated" };
}
