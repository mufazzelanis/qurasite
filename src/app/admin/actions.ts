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
import { ROLE_COLORS, isValidPermission, type Section } from "@/lib/permissions";
import { descendantIds } from "@/lib/category-tree";
import { parseBlocks, type PageBlock } from "@/lib/page-blocks";
import { PAGE_TEMPLATES } from "@/lib/page-templates";
import { LANDING_DESIGNS } from "@/lib/landing-designs";

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
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

export async function loginAction(_: unknown, fd: FormData) {
  const { ip, userAgent } = await clientInfo();
  if (!rateLimit(`login:${ip}`, 8, 15 * 60 * 1000)) return { error: "Too many attempts. Try again in 15 minutes." };
  const email = str(fd, "email").toLowerCase();

  let admin;
  try {
    admin = await db.admin.findUnique({ where: { email } });
  } catch {
    // don't disguise a DB outage as a wrong password
    return { error: "Cannot reach the database. Is PostgreSQL running?" };
  }
  const record = (ok: boolean, reason?: string) => db.loginEvent.create({ data: { adminId: admin?.id, email, ok, reason, ip, userAgent: userAgent.slice(0, 300) } }).catch(() => {});

  if (!admin) {
    await record(false, "Unknown email");
    return { error: "Invalid email or password" };
  }
  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    await record(false, "Locked");
    const mins = Math.ceil((+admin.lockedUntil - Date.now()) / 60000);
    return { error: `Too many wrong passwords. Account locked for ${mins} more minute${mins > 1 ? "s" : ""}.` };
  }
  if (!(await bcrypt.compare(str(fd, "password"), admin.password))) {
    const failed = admin.failedLogins + 1;
    const lock = failed >= MAX_FAILED_LOGINS;
    await db.admin.update({ where: { id: admin.id }, data: { failedLogins: lock ? 0 : failed, lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60000) : undefined } });
    await record(false, lock ? "Wrong password — locked" : "Wrong password");
    if (lock) return { error: `Too many wrong passwords. Account locked for ${LOCK_MINUTES} minutes.` };
    return { error: `Invalid email or password${MAX_FAILED_LOGINS - failed <= 2 ? ` (${MAX_FAILED_LOGINS - failed} tries left)` : ""}` };
  }
  if (!admin.active) {
    await record(false, "Disabled");
    return { error: "This account is disabled. Ask an admin to enable it." };
  }

  const token = await signSession({ id: admin.id, email: admin.email, name: admin.name, role: admin.role, sv: admin.sessionVersion });
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 7 * 86400 });
  await db.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date(), lastSeenAt: new Date(), lastLoginIp: ip, failedLogins: 0, lockedUntil: null } });
  await record(true);
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
  const me = await requireAdmin("orders", "edit");
  const id = str(fd, "id");
  const status = str(fd, "status") as OrderStatus;
  // only touch fields the form actually sent (quick-action buttons send just the status)
  const extra: { courier?: string | null; trackingCode?: string | null } = {};
  if (fd.has("courier")) extra.courier = opt(fd, "courier");
  if (fd.has("trackingCode")) extra.trackingCode = opt(fd, "trackingCode");
  const o = await applyStatus(id, status, me.name, opt(fd, "note"), extra);
  if (fd.has("adminNote")) await db.order.update({ where: { id }, data: { adminNote: opt(fd, "adminNote") } });
  await logActivity(me, `Order ${o?.orderNo} → ${status}`, o?.orderNo);
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
}

export async function bulkOrders(fd: FormData) {
  const me = await requireAdmin("orders", fd.get("bulk") === "print" ? "export" : "edit");
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
  const me = await requireAdmin("orders", "edit");
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
  const me = await requireAdmin("orders", "edit");
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
  const me = await requireAdmin("orders", "delete");
  const o = await db.order.delete({ where: { id: str(fd, "id") } });
  await logActivity(me, `Deleted order ${o.orderNo}`, o.orderNo);
  redirect("/admin/orders");
}

// ── Blocklist / customers ─────────────────────────────
export async function addBlock(fd: FormData) {
  const me = await requireAdmin("customers", "edit");
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
  const me = await requireAdmin("customers", "edit");
  const b = await db.blocklist.delete({ where: { id: str(fd, "id") } });
  await logActivity(me, `Unblocked ${b.type} ${b.value}`, b.value);
  revalidatePath("/admin/fraud");
  revalidatePath("/admin/customers");
}

// ── Products & categories ─────────────────────────────
export async function saveProduct(fd: FormData) {
  const me = await requireAdmin("products", str(fd, "id") ? "edit" : "create");
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
    seoTitle: opt(fd, "seoTitle"),
    seoDesc: opt(fd, "seoDesc"),
    imageAlt: opt(fd, "imageAlt"),
  };
  if (id) await db.product.update({ where: { id }, data });
  else await db.product.create({ data });
  await logActivity(me, `${id ? "Updated" : "Created"} product ${name}`, data.slug);
  bustCatalog();
  redirect("/admin/products");
}

export async function deleteProduct(fd: FormData) {
  const me = await requireAdmin("products", "delete");
  const id = str(fd, "id");
  const used = await db.orderItem.count({ where: { productId: id } });
  const p = used ? await db.product.update({ where: { id }, data: { active: false } }) : await db.product.delete({ where: { id } });
  await logActivity(me, `${used ? "Hid" : "Deleted"} product ${p.name}`);
  bustCatalog();
  revalidatePath("/admin/products");
}

/** One-click switch of a boolean product flag (active / featured / isAddon) */
export async function toggleProductFlag(fd: FormData) {
  const me = await requireAdmin("products", "edit");
  const field = str(fd, "field");
  if (field !== "active" && field !== "featured" && field !== "isAddon") return;
  const p = await db.product.findUnique({ where: { id: str(fd, "id") } });
  if (!p) return;
  const value = !p[field];
  await db.product.update({ where: { id: p.id }, data: { [field]: value } });
  await logActivity(me, `${value ? "Enabled" : "Disabled"} ${field} on ${p.name}`, p.slug);
  bustCatalog();
  revalidatePath("/admin/products");
}

/** Copy a product (hidden, fresh slug) so it can be edited into a variant */
export async function duplicateProduct(fd: FormData) {
  const me = await requireAdmin("products", "create");
  const p = await db.product.findUnique({ where: { id: str(fd, "id") } });
  if (!p) return;
  let slug = `${p.slug}-copy`;
  for (let i = 2; await db.product.findUnique({ where: { slug }, select: { id: true } }); i++) slug = `${p.slug}-copy-${i}`;
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = p;
  const copy = await db.product.create({ data: { ...rest, slug, name: `${p.name} (copy)`, nameBn: p.nameBn ? `${p.nameBn} (কপি)` : null, active: false, featured: false } });
  await logActivity(me, `Duplicated product ${p.name}`, slug);
  revalidatePath("/admin/products");
  redirect(`/admin/products/${copy.id}`);
}

/** Inline stock edit from the products table */
export async function updateProductStock(fd: FormData) {
  const me = await requireAdmin("products", "edit");
  const stock = Math.max(0, Math.floor(num(fd, "stock") ?? 0));
  const p = await db.product.update({ where: { id: str(fd, "id") }, data: { stock } });
  await logActivity(me, `Set stock of ${p.name} to ${stock}`, p.slug);
  bustCatalog();
  revalidatePath("/admin/products");
}

export async function bulkProducts(fd: FormData) {
  const me = await requireAdmin("products", fd.get("bulk") === "delete" ? "delete" : "edit");
  const ids = fd.getAll("ids").map(String).filter(Boolean);
  const action = str(fd, "bulk");
  if (!ids.length || !action) return;
  const where = { id: { in: ids } };
  if (action === "activate") await db.product.updateMany({ where, data: { active: true } });
  else if (action === "hide") await db.product.updateMany({ where, data: { active: false } });
  else if (action === "feature") await db.product.updateMany({ where, data: { featured: true } });
  else if (action === "unfeature") await db.product.updateMany({ where, data: { featured: false } });
  else if (action === "delete") {
    // products with orders are hidden instead of deleted (order history keeps them)
    const used = new Set((await db.orderItem.findMany({ where: { productId: { in: ids } }, select: { productId: true }, distinct: ["productId"] })).map((i) => i.productId));
    await db.product.updateMany({ where: { id: { in: ids.filter((i) => used.has(i)) } }, data: { active: false } });
    await db.product.deleteMany({ where: { id: { in: ids.filter((i) => !used.has(i)) } } });
  } else return;
  await logActivity(me, `Bulk ${action} on ${ids.length} products`);
  bustCatalog();
  revalidatePath("/admin/products");
}

/** true if making `parentId` the parent of `id` would create a loop */
async function wouldLoop(id: string, parentId: string | null) {
  if (!parentId) return false;
  if (parentId === id) return true;
  const all = await db.category.findMany({ select: { id: true, parentId: true } });
  return descendantIds(all.map((c) => ({ ...c, sortOrder: 0, name: "", slug: "" })), id).has(parentId);
}

export async function saveCategory(fd: FormData): Promise<{ ok?: string; error?: string; id?: string }> {
  const me = await requireAdmin("products", str(fd, "id") ? "edit" : "create");
  const id = str(fd, "id");
  const name = str(fd, "name");
  if (!name) return { error: "Name is required" };
  const parentId = opt(fd, "parentId");
  if (id && (await wouldLoop(id, parentId))) return { error: "A category can't be inside itself or its own subcategory" };
  const slug = slugify(str(fd, "slug") || name) || `cat-${Date.now()}`;
  const clash = await db.category.findUnique({ where: { slug }, select: { id: true } });
  if (clash && clash.id !== id) return { error: `URL "/category/${slug}" is already used` };

  // position is managed by the tree: new categories go last in their level, edits keep their place
  // (unless the parent changed → move to the end of the new level)
  const old = id ? await db.category.findUnique({ where: { id }, select: { parentId: true } }) : null;
  const lastInLevel = async () => ((await db.category.aggregate({ where: { parentId }, _max: { sortOrder: true } }))._max.sortOrder ?? 0) + 1;
  const sortOrder = num(fd, "sortOrder") ?? (!id || old?.parentId !== parentId ? await lastInLevel() : undefined);
  const data = {
    name,
    nameBn: opt(fd, "nameBn"),
    slug,
    image: opt(fd, "image"),
    sortOrder,
    active: fd.get("active") !== "off",
    featured: fd.get("featured") === "on",
    parentId,
    description: opt(fd, "description"),
    seoTitle: opt(fd, "seoTitle"),
    seoDesc: opt(fd, "seoDesc"),
  };
  const c = id ? await db.category.update({ where: { id }, data }) : await db.category.create({ data });
  await logActivity(me, `${id ? "Updated" : "Created"} category ${name}`);
  bustCatalog();
  revalidatePath("/admin/categories");
  return { ok: id ? "Category saved" : "Category created", id: c.id };
}

/** Saves the tree after drag & drop / move buttons: [{ id, parentId, sortOrder }] */
export async function arrangeCategories(rows: { id: string; parentId: string | null; sortOrder: number }[]): Promise<{ ok?: boolean; error?: string }> {
  const me = await requireAdmin("products", "edit");
  const all = await db.category.findMany({ select: { id: true, parentId: true } });
  const next = new Map(all.map((c) => [c.id, c.parentId]));
  for (const r of rows) if (next.has(r.id)) next.set(r.id, r.parentId);
  // reject loops in the resulting tree
  for (const id of next.keys()) {
    const seen = new Set<string>();
    for (let p = next.get(id); p; p = next.get(p) ?? null) {
      if (p === id || seen.has(p)) return { error: "That move would put a category inside itself" };
      seen.add(p);
    }
  }
  await db.$transaction(rows.filter((r) => next.has(r.id)).map((r) => db.category.update({ where: { id: r.id }, data: { parentId: r.parentId, sortOrder: r.sortOrder } })));
  await logActivity(me, `Rearranged ${rows.length} categories`);
  bustCatalog();
  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function deleteCategory(fd: FormData): Promise<{ ok?: string; error?: string }> {
  const me = await requireAdmin("products", "delete");
  const c = await db.category.findUnique({ where: { id: str(fd, "id") } });
  if (!c) return { error: "Category not found" };
  // subcategories move up one level instead of becoming orphans
  await db.$transaction([db.category.updateMany({ where: { parentId: c.id }, data: { parentId: c.parentId } }), db.category.delete({ where: { id: c.id } })]);
  await logActivity(me, `Deleted category ${c.name}`);
  bustCatalog();
  revalidatePath("/admin/categories");
  return { ok: `${c.name} deleted` };
}

// ── Landing pages ─────────────────────────────────────
export async function createLanding(_: unknown, fd: FormData) {
  const me = await requireAdmin("landing", "create");
  const slug = slugify(str(fd, "slug"));
  if (!slug) return { error: "Slug দিন (শুধু a-z, 0-9, -)" };
  if (RESERVED_SLUGS.has(slug)) return { error: `"${slug}" সংরক্ষিত — অন্য নাম দিন` };
  if (await slugTaken(slug)) return { error: "এই URL আগে থেকেই কোনো landing page বা page ব্যবহার করছে" };
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
  // chosen design (wizard) → its colors too
  const design = LANDING_DESIGNS.find((d) => d.key === str(fd, "design"));
  if (design) content = { ...content, design: design.key, primary: design.primary, accent: design.accent };
  const lp = await db.landingPage.create({ data: { slug, title: str(fd, "title") || slug, productId, addonIds, active: fd.get("publish") === "on", content: content as object } });
  await logActivity(me, `Created landing page /${slug}`, slug);
  revalidateTag("landing");
  redirect(`/admin/landing/${lp.id}`);
}

/** Landing pages and content pages share the root URL space (/<slug>) */
async function slugTaken(slug: string, except?: { landing?: string; page?: string }) {
  if (RESERVED_SLUGS.has(slug)) return true;
  const [lp, pg] = await Promise.all([
    db.landingPage.findFirst({ where: { slug, id: { not: except?.landing ?? "" } }, select: { id: true } }),
    db.page.findFirst({ where: { slug, id: { not: except?.page ?? "" } }, select: { id: true } }),
  ]);
  return !!(lp || pg);
}

const cleanPixels = (mode: string, ids: string[]) => {
  const pixelMode = ["site", "own", "none"].includes(mode) ? mode : "site";
  return { pixelMode, pixelIds: pixelMode === "own" ? [...new Set(ids.map((x) => x.trim()).filter((x) => /^\d{5,20}$/.test(x)))] : [] };
};

export async function saveLanding(id: string, data: { slug: string; title: string; active: boolean; productId: string; extraIds: string[]; addonIds: string[]; pixelMode: string; pixelIds: string[]; seoTitle: string; seoDesc: string; content: LandingContent }) {
  const me = await requireAdmin("landing", "edit");
  const slug = slugify(data.slug);
  if (!slug || RESERVED_SLUGS.has(slug)) return { error: "এই slug ব্যবহার করা যাবে না" };
  if (await slugTaken(slug, { landing: id })) return { error: "এই URL আগে থেকেই কোনো landing page বা page ব্যবহার করছে" };
  const px = cleanPixels(data.pixelMode, data.pixelIds);
  if (px.pixelMode === "own" && !px.pixelIds.length) return { error: "Own pixels: অন্তত একটি pixel বাছুন" };
  const old = await db.landingPage.findUnique({ where: { id } });
  await db.landingPage.update({
    where: { id },
    data: { slug, title: data.title, active: data.active, productId: data.productId, extraIds: data.extraIds, addonIds: data.addonIds, ...px, pixelId: null, seoTitle: data.seoTitle || null, seoDesc: data.seoDesc || null, content: data.content as object },
  });
  await logActivity(me, `Updated landing page /${slug}`, slug);
  revalidateTag("landing");
  revalidatePath(`/${slug}`);
  if (old && old.slug !== slug) revalidatePath(`/${old.slug}`);
  return { ok: true, slug };
}

export async function duplicateLanding(fd: FormData) {
  const me = await requireAdmin("landing", "create");
  const src = await db.landingPage.findUnique({ where: { id: str(fd, "id") } });
  if (!src) return;
  let slug = `${src.slug}-copy`;
  for (let i = 2; await slugTaken(slug); i++) slug = `${src.slug}-copy${i}`;
  const lp = await db.landingPage.create({
    data: { slug, title: `${src.title} (copy)`, active: false, productId: src.productId, extraIds: src.extraIds, addonIds: src.addonIds, content: src.content as object, pixelMode: src.pixelMode, pixelIds: src.pixelIds, seoTitle: src.seoTitle, seoDesc: src.seoDesc },
  });
  await logActivity(me, `Duplicated /${src.slug} → /${slug}`, slug);
  revalidateTag("landing");
  redirect(`/admin/landing/${lp.id}`);
}

export async function toggleLanding(fd: FormData) {
  const me = await requireAdmin("landing", "edit");
  const lp = await db.landingPage.findUnique({ where: { id: str(fd, "id") } });
  if (!lp) return;
  await db.landingPage.update({ where: { id: lp.id }, data: { active: !lp.active } });
  await logActivity(me, `${lp.active ? "Unpublished" : "Published"} landing page /${lp.slug}`, lp.slug);
  revalidateTag("landing");
  revalidatePath(`/${lp.slug}`);
  revalidatePath("/admin/landing");
}

export async function deleteLanding(fd: FormData) {
  const me = await requireAdmin("landing", "delete");
  const lp = await db.landingPage.delete({ where: { id: str(fd, "id") } });
  await logActivity(me, `Deleted landing page /${lp.slug}`, lp.slug);
  revalidateTag("landing");
  revalidatePath(`/${lp.slug}`);
  redirect("/admin/landing");
}

// ── Content pages (/<slug>) ───────────────────────────
export type PageInput = {
  title: string;
  slug: string;
  excerpt: string;
  blocks: PageBlock[];
  coverImage: string;
  layout: string;
  menu: string;
  sortOrder: number;
  active: boolean;
  seoTitle: string;
  seoDesc: string;
  ogImage: string;
  noindex: boolean;
  pixelMode: string;
  pixelIds: string[];
};

function bustPages(...slugs: string[]) {
  revalidateTag("pages");
  for (const s of slugs) revalidatePath(`/${s}`);
  revalidatePath("/", "layout"); // header / footer menus
  revalidatePath("/admin/pages");
}

export async function savePage(id: string | null, v: PageInput): Promise<{ ok?: string; error?: string; id?: string; slug?: string }> {
  const me = await requireAdmin("landing", id ? "edit" : "create");
  const title = v.title.trim();
  if (!title) return { error: "Title is required" };
  const slug = slugify(v.slug || title);
  if (!slug) return { error: "URL needs English letters or numbers (a-z, 0-9, -)" };
  if (await slugTaken(slug, { page: id ?? undefined })) return { error: `/${slug} is already used by a landing page, page or the system` };
  const px = cleanPixels(v.pixelMode, v.pixelIds);
  if (px.pixelMode === "own" && !px.pixelIds.length) return { error: "Own pixels: pick at least one pixel" };
  const data = {
    title,
    slug,
    excerpt: v.excerpt.trim() || null,
    blocks: parseBlocks(v.blocks) as object[],
    coverImage: v.coverImage.trim() || null,
    layout: v.layout === "wide" ? "wide" : "default",
    menu: ["header", "footer"].includes(v.menu) ? v.menu : "none",
    sortOrder: Math.round(Number(v.sortOrder) || 0),
    active: !!v.active,
    seoTitle: v.seoTitle.trim() || null,
    seoDesc: v.seoDesc.trim() || null,
    ogImage: v.ogImage.trim() || null,
    noindex: !!v.noindex,
    ...px,
  };
  const old = id ? await db.page.findUnique({ where: { id }, select: { slug: true } }) : null;
  const p = id ? await db.page.update({ where: { id }, data }) : await db.page.create({ data });
  await logActivity(me, `${id ? "Updated" : "Created"} page /${slug}`, slug);
  bustPages(slug, ...(old && old.slug !== slug ? [old.slug] : []));
  return { ok: id ? "Page saved — live now" : "Page created", id: p.id, slug };
}

export async function createPageFromTemplate(fd: FormData) {
  const me = await requireAdmin("landing", "create");
  const tpl = PAGE_TEMPLATES.find((t) => t.key === str(fd, "template")) ?? PAGE_TEMPLATES[0];
  let slug = tpl.slug;
  for (let i = 2; await slugTaken(slug); i++) slug = `${tpl.slug}-${i}`;
  const p = await db.page.create({ data: { title: tpl.title, slug, excerpt: tpl.excerpt, blocks: tpl.blocks() as object[], menu: tpl.menu, active: false } });
  await logActivity(me, `Created page /${slug} from template "${tpl.name}"`, slug);
  revalidatePath("/admin/pages");
  redirect(`/admin/pages/${p.id}`);
}

export async function togglePage(fd: FormData) {
  const me = await requireAdmin("landing", "edit");
  const p = await db.page.findUnique({ where: { id: str(fd, "id") } });
  if (!p) return;
  await db.page.update({ where: { id: p.id }, data: { active: !p.active } });
  await logActivity(me, `${p.active ? "Unpublished" : "Published"} page /${p.slug}`, p.slug);
  bustPages(p.slug);
}

export async function duplicatePage(fd: FormData) {
  const me = await requireAdmin("landing", "create");
  const src = await db.page.findUnique({ where: { id: str(fd, "id") } });
  if (!src) return;
  let slug = `${src.slug}-copy`;
  for (let i = 2; await slugTaken(slug); i++) slug = `${src.slug}-copy-${i}`;
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = src;
  const p = await db.page.create({ data: { ...rest, blocks: rest.blocks as object[], slug, title: `${src.title} (copy)`, active: false, menu: "none" } });
  await logActivity(me, `Duplicated page /${src.slug} → /${slug}`, slug);
  revalidatePath("/admin/pages");
  redirect(`/admin/pages/${p.id}`);
}

export async function deletePage(fd: FormData) {
  const me = await requireAdmin("landing", "delete");
  const p = await db.page.delete({ where: { id: str(fd, "id") } });
  await logActivity(me, `Deleted page /${p.slug}`, p.slug);
  bustPages(p.slug);
  if (fd.get("back")) redirect("/admin/pages");
}

// ── Marketing: reviews, coupons, drafts ───────────────
export async function saveReview(fd: FormData) {
  const me = await requireAdmin("marketing", "create");
  await db.review.create({ data: { name: str(fd, "name"), location: opt(fd, "location"), rating: Math.min(5, Math.max(1, num(fd, "rating") ?? 5)), text: str(fd, "text") } });
  await logActivity(me, `Added review by ${str(fd, "name")}`);
  bustCatalog();
  revalidatePath("/admin/reviews");
}
export async function toggleReview(fd: FormData) {
  await requireAdmin("marketing", "edit");
  const r = await db.review.findUnique({ where: { id: str(fd, "id") } });
  if (r) await db.review.update({ where: { id: r.id }, data: { active: !r.active } });
  bustCatalog();
  revalidatePath("/admin/reviews");
}
export async function deleteReview(fd: FormData) {
  await requireAdmin("marketing", "delete");
  await db.review.delete({ where: { id: str(fd, "id") } });
  bustCatalog();
  revalidatePath("/admin/reviews");
}

export async function saveCoupon(fd: FormData) {
  const me = await requireAdmin("marketing", str(fd, "id") ? "edit" : "create");
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
  const me = await requireAdmin("marketing", "delete");
  const c = await db.coupon.delete({ where: { id: str(fd, "id") } });
  await logActivity(me, `Deleted coupon ${c.code}`);
  revalidatePath("/admin/coupons");
}

export async function deleteDraft(fd: FormData) {
  await requireAdmin("orders", "delete");
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
  seo: "mainsite",
  typography: "mainsite",
};

export async function saveSettingsAction<K extends keyof AllSettings>(key: K, value: AllSettings[K]) {
  const me = await requireAdmin(SETTING_SECTION[key], "edit");
  await saveSetting(key, value);
  await logActivity(me, `Updated ${key} settings`);
  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Facebook Pixel & Conversions API ──────────────────
export type PixelInput = { id: string; label: string; token: string; prevId: string; removeToken: boolean; site: boolean };
export type PixelSettingsInput = Omit<AllSettings["tracking"], "pixels"> & { pixels: PixelInput[] };

/** Tokens never travel to the browser: an empty token field keeps the saved one. */
export async function savePixelSettings(v: PixelSettingsInput) {
  const me = await requireAdmin("system", "edit");
  const old = await getSetting("tracking");
  const pixels = v.pixels
    .map((p) => ({ ...p, id: p.id.replace(/\D/g, "") }))
    .filter((p) => p.id)
    .slice(0, 10)
    .map((p) => {
      const prev = old.pixels.find((x) => x.id === (p.prevId || p.id));
      return { id: p.id, label: p.label.trim().slice(0, 60), token: p.removeToken ? "" : p.token.trim() || prev?.token || "", site: p.site !== false };
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
  await requireAdmin("system", "view");
  return verifyPixels();
}

export async function sendTestPurchaseAction(code: string) {
  await requireAdmin("system", "edit");
  const { ip, userAgent } = await clientInfo();
  const lib = (await getSetting("tracking")).pixels.map((p) => p.id).filter(Boolean);
  const r = await sendCapi({
    force: true,
    pixelIds: lib, // test every pixel in the library, including landing-only ones
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
  await requireAdmin("system", "edit");
  const r = await retryFailed(undefined, 200);
  revalidatePath("/admin/pixel");
  return r;
}

export async function testSms(phone: string) {
  await requireAdmin("system", "edit");
  return sendSms(phone, "Qura Food test SMS ✓");
}

// ── Users & roles ─────────────────────────────────────
type UserResult = { ok?: string; error?: string; password?: string };
type Me = Awaited<ReturnType<typeof requireAdmin>>;

/** Never leave the shop without an active Super Admin */
async function isLastActiveAdmin(id: string) {
  const u = await db.admin.findUnique({ where: { id }, select: { role: true, active: true } });
  if (!u || u.role !== "ADMIN" || !u.active) return false;
  return (await db.admin.count({ where: { role: "ADMIN", active: true } })) <= 1;
}

/** No privilege escalation: a non-super user can only hand out permissions they have themselves */
const missingPerms = (me: Me, perms: string[]) => (me.role === "ADMIN" ? [] : perms.filter((p) => !me.permissions.includes(p)));

export async function saveUser(_: unknown, fd: FormData): Promise<UserResult> {
  const me = await requireAdmin("users", str(fd, "id") ? "edit" : "create");
  const id = str(fd, "id");
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  const password = str(fd, "password");
  const roleKey = str(fd, "roleId"); // "super" or an AdminRole id
  const superAdmin = roleKey === "super";
  const active = fd.get("active") === "on" || id === me.id;
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return { error: "Name and a valid email are required" };
  if ((!id || password) && password.length < 8) return { error: "Password must be at least 8 characters" };

  const role = superAdmin ? null : await db.adminRole.findUnique({ where: { id: roleKey } });
  if (!superAdmin && !role) return { error: "Choose a role" };
  const target = id ? await db.admin.findUnique({ where: { id }, select: { role: true } }) : null;
  if (me.role !== "ADMIN" && (superAdmin || target?.role === "ADMIN")) return { error: "Only a Super Admin can create or change a Super Admin" };
  if (role && missingPerms(me, role.permissions).length) return { error: `You can't assign "${role.name}" — it has permissions you don't have` };
  if (id === me.id && me.role === "ADMIN" && !superAdmin) return { error: "You cannot remove your own Super Admin access" };
  if (id && (!superAdmin || !active) && (await isLastActiveAdmin(id))) return { error: "This is the last active Super Admin — make someone else Super Admin first" };

  const data = {
    name,
    email,
    role: (superAdmin ? "ADMIN" : "STAFF") as Role,
    roleId: role?.id ?? null,
    permissions: [],
    active,
    phone: opt(fd, "phone"),
    note: opt(fd, "note"),
    ...(password ? { password: await bcrypt.hash(password, 10), passwordChangedAt: new Date() } : {}),
  };
  try {
    if (id) await db.admin.update({ where: { id }, data });
    else await db.admin.create({ data: { ...data, password: data.password! } });
  } catch {
    return { error: "This email is already used by another user" };
  }
  await logActivity(me, `${id ? "Updated" : "Created"} user ${email} (${superAdmin ? "Super Admin" : role!.name})`);
  revalidatePath("/admin/users");
  return { ok: id ? "User updated" : "User created" };
}

async function userAction(fd: FormData, action: "edit" | "delete", fn: (target: { id: string; email: string; name: string; role: string }, me: Me) => Promise<UserResult>): Promise<UserResult> {
  const me = await requireAdmin("users", action);
  const target = await db.admin.findUnique({ where: { id: str(fd, "id") }, select: { id: true, email: true, name: true, role: true } });
  if (!target) return { error: "User not found" };
  if (target.role === "ADMIN" && me.role !== "ADMIN") return { error: "Only a Super Admin can manage a Super Admin" };
  const r = await fn(target, me);
  revalidatePath("/admin/users");
  return r;
}

export async function toggleUserActive(fd: FormData) {
  return userAction(fd, "edit", async (t, me) => {
    if (t.id === me.id) return { error: "You cannot disable yourself" };
    const u = await db.admin.findUniqueOrThrow({ where: { id: t.id } });
    if (u.active && (await isLastActiveAdmin(t.id))) return { error: "This is the last active Super Admin" };
    // disabling also kills open sessions
    await db.admin.update({ where: { id: t.id }, data: { active: !u.active, ...(u.active ? { sessionVersion: { increment: 1 } } : { failedLogins: 0, lockedUntil: null }) } });
    await logActivity(me, `${u.active ? "Disabled" : "Enabled"} user ${t.email}`);
    return { ok: u.active ? `${t.name} disabled and signed out` : `${t.name} can log in again` };
  });
}

export async function revokeUserSessions(fd: FormData) {
  return userAction(fd, "edit", async (t, me) => {
    await db.admin.update({ where: { id: t.id }, data: { sessionVersion: { increment: 1 } } });
    await logActivity(me, `Signed out ${t.email} from all devices`);
    return { ok: t.id === me.id ? "Signed out everywhere — log in again" : `${t.name} signed out from all devices` };
  });
}

export async function resetUserPassword(fd: FormData) {
  return userAction(fd, "edit", async (t, me) => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    const password = Array.from(bytes, (b) => chars[b % chars.length]).join("");
    // new password + sign out old sessions + clear any lock
    await db.admin.update({ where: { id: t.id }, data: { password: await bcrypt.hash(password, 10), passwordChangedAt: new Date(), sessionVersion: { increment: 1 }, failedLogins: 0, lockedUntil: null } });
    await logActivity(me, `Reset password of ${t.email}`);
    return { ok: "Password reset", password };
  });
}

export async function unlockUser(fd: FormData) {
  return userAction(fd, "edit", async (t, me) => {
    await db.admin.update({ where: { id: t.id }, data: { failedLogins: 0, lockedUntil: null } });
    await logActivity(me, `Unlocked ${t.email}`);
    return { ok: `${t.name} unlocked` };
  });
}

export async function deleteUser(fd: FormData) {
  return userAction(fd, "delete", async (t, me) => {
    if (t.id === me.id) return { error: "You cannot delete yourself" };
    if (await isLastActiveAdmin(t.id)) return { error: "This is the last active Super Admin" };
    await db.admin.delete({ where: { id: t.id } });
    await logActivity(me, `Deleted user ${t.email}`);
    return { ok: `${t.name} deleted` };
  });
}

// ── Roles ─────────────────────────────────────────────
export type RoleInput = { name: string; description: string; color: string; permissions: string[] };

export async function saveRole(id: string | null, v: RoleInput): Promise<{ ok?: string; error?: string; id?: string }> {
  const me = await requireAdmin("users", id ? "edit" : "create");
  const name = v.name.trim().slice(0, 40);
  if (!name) return { error: "Role name is required" };
  if (/^super\s*admin$/i.test(name)) return { error: "“Super Admin” is reserved" };
  const permissions = [...new Set(v.permissions.filter(isValidPermission))];
  const missing = missingPerms(me, permissions);
  if (missing.length) return { error: `You can't grant permissions you don't have: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "…" : ""}` };
  const color = (ROLE_COLORS as readonly string[]).includes(v.color) ? v.color : "emerald";
  try {
    const data = { name, description: v.description.trim().slice(0, 200) || null, color, permissions };
    const r = id ? await db.adminRole.update({ where: { id }, data }) : await db.adminRole.create({ data });
    await logActivity(me, `${id ? "Updated" : "Created"} role ${name} (${permissions.length} permissions)`);
    revalidatePath("/admin/users");
    return { ok: id ? "Role saved — applies to its users immediately" : "Role created", id: r.id };
  } catch {
    return { error: "A role with this name already exists" };
  }
}

export async function deleteRole(id: string): Promise<{ ok?: string; error?: string }> {
  const me = await requireAdmin("users", "delete");
  const r = await db.adminRole.findUnique({ where: { id }, include: { _count: { select: { admins: true } } } });
  if (!r) return { error: "Role not found" };
  if (r._count.admins) return { error: `${r._count.admins} user(s) still have this role — move them to another role first` };
  await db.adminRole.delete({ where: { id } });
  await logActivity(me, `Deleted role ${r.name}`);
  revalidatePath("/admin/users");
  return { ok: `Role “${r.name}” deleted` };
}

export async function changePassword(_: unknown, fd: FormData) {
  const me = await requireAdmin();
  const next = str(fd, "next");
  if (next.length < 8) return { error: "New password must be at least 8 characters" };
  const admin = await db.admin.findUnique({ where: { id: me.id } });
  if (!admin || !(await bcrypt.compare(str(fd, "current"), admin.password))) return { error: "Current password is wrong" };
  await db.admin.update({ where: { id: me.id }, data: { password: await bcrypt.hash(next, 10), passwordChangedAt: new Date() } });
  await logActivity(me, "Changed own password");
  return { ok: "Password updated" };
}
