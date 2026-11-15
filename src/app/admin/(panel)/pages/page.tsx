import Link from "next/link";
import { Copy, Eye, EyeOff, ExternalLink, FileText, Globe, Menu, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { createPageFromTemplate, deletePage, duplicatePage, togglePage } from "@/app/admin/actions";
import { PAGE_TEMPLATES } from "@/lib/page-templates";
import { parseBlocks } from "@/lib/page-blocks";
import { cn } from "@/lib/utils";
import ConfirmButton from "@/components/admin/ConfirmButton";

export default async function PagesAdmin() {
  await requireAdmin("landing");
  const pages = await db.page.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  const dt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" });
  const MENU = { header: "Header", footer: "Footer", none: "—" } as Record<string, string>;
  const PIXEL = { site: ["Main site", "bg-zinc-100 text-zinc-600"], own: ["Own", "bg-violet-50 text-violet-700"], none: ["None", "bg-rose-50 text-rose-600"] } as Record<string, [string, string]>;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pages</h1>
          <p className="mt-1 text-sm text-zinc-500">About, contact, policies, FAQ — any page at qurafood.com/your-url, with its own SEO and Facebook pixel.</p>
        </div>
        <form action={createPageFromTemplate}>
          <input type="hidden" name="template" value="blank" />
          <button className="a-btn !rounded-xl shadow-lg shadow-brand-900/20">
            <Plus className="size-4" /> New page
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={FileText} label="Pages" value={pages.length} />
        <Stat icon={Globe} label="Published" value={pages.filter((p) => p.active).length} />
        <Stat icon={Menu} label="In menus" value={pages.filter((p) => p.menu !== "none").length} />
        <Stat icon={Target} label="Own pixel" value={pages.filter((p) => p.pixelMode === "own").length} />
      </div>

      {/* templates */}
      <section className="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-bold tracking-wider text-zinc-400 uppercase">Start from a template</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {PAGE_TEMPLATES.map((t) => (
            <form key={t.key} action={createPageFromTemplate}>
              <input type="hidden" name="template" value={t.key} />
              <button className="group h-full w-full rounded-xl border border-zinc-200 p-3 text-left transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50/40 hover:shadow-md">
                <span className="text-2xl">{t.emoji}</span>
                <span className="mt-1 block text-sm font-semibold">{t.name}</span>
                <span className="block text-[11px] leading-snug text-zinc-500">{t.desc}</span>
              </button>
            </form>
          ))}
        </div>
      </section>

      {/* list */}
      <div className="overflow-x-auto rounded-2xl border border-zinc-200/70 bg-white shadow-sm">
        <table className="w-full min-w-[820px]">
          <thead className="border-b border-zinc-200 bg-zinc-50/70">
            <tr>
              <th className="a-th">Page</th>
              <th className="a-th">Menu</th>
              <th className="a-th">Facebook pixel</th>
              <th className="a-th">Status</th>
              <th className="a-th">Updated</th>
              <th className="a-th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {pages.map((p) => {
              const blocks = parseBlocks(p.blocks).length;
              const [px, pxCls] = PIXEL[p.pixelMode] ?? PIXEL.site;
              return (
                <tr key={p.id} className={cn("group hover:bg-zinc-50/60", !p.active && "opacity-70")}>
                  <td className="a-td">
                    <Link href={`/admin/pages/${p.id}`} className="font-semibold text-zinc-900 hover:text-brand-700">
                      {p.title}
                    </Link>
                    <p className="flex items-center gap-2 text-xs text-zinc-400">
                      <span className="font-mono">/{p.slug}</span> · {blocks} blocks
                      {p.noindex && <span className="rounded bg-zinc-100 px-1 text-[10px] font-semibold text-zinc-500">noindex</span>}
                    </p>
                  </td>
                  <td className="a-td text-sm">{MENU[p.menu] ?? "—"}</td>
                  <td className="a-td">
                    <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", pxCls)}>
                      {px}
                      {p.pixelMode === "own" && ` · ${p.pixelIds.length}`}
                    </span>
                  </td>
                  <td className="a-td">
                    <form action={togglePage}>
                      <input type="hidden" name="id" value={p.id} />
                      <button title="Click to toggle" className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 transition", p.active ? "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100" : "bg-zinc-100 text-zinc-500 ring-zinc-200 hover:bg-zinc-200")}>
                        {p.active ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                        {p.active ? "Published" : "Draft"}
                      </button>
                    </form>
                  </td>
                  <td className="a-td text-xs text-zinc-500">{dt(p.updatedAt)}</td>
                  <td className="a-td">
                    <div className="flex justify-end gap-1.5">
                      <Link href={`/admin/pages/${p.id}`} className="a-btn-light !rounded-lg !px-2.5 !py-1.5" title="Edit">
                        <Pencil className="size-3.5" />
                      </Link>
                      <a href={`/${p.slug}`} target="_blank" className="a-btn-light !rounded-lg !px-2.5 !py-1.5" title="View">
                        <ExternalLink className="size-3.5" />
                      </a>
                      <form action={duplicatePage}>
                        <input type="hidden" name="id" value={p.id} />
                        <button className="a-btn-light !rounded-lg !px-2.5 !py-1.5" title="Duplicate">
                          <Copy className="size-3.5" />
                        </button>
                      </form>
                      <form action={deletePage}>
                        <input type="hidden" name="id" value={p.id} />
                        <ConfirmButton message={`Delete the page "${p.title}" (/${p.slug})? Links to it will show 404.`} className="a-btn-light !rounded-lg !px-2.5 !py-1.5 !text-rose-600 hover:!bg-rose-50" title="Delete">
                          <Trash2 className="size-3.5" />
                        </ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!pages.length && (
              <tr>
                <td colSpan={6} className="py-14 text-center text-sm text-zinc-400">
                  No pages yet — pick a template above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-sm">
      <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">{label}</p>
        <p className="text-xl font-bold tabular-nums">{value}</p>
      </div>
    </div>
  );
}
