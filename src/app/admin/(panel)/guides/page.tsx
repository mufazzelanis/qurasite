import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { deleteGuide, saveGuide } from "@/app/admin/actions";

export default async function GuidesPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireAdmin("landing");
  const { edit } = await searchParams;
  const [guides, current] = await Promise.all([db.guidePage.findMany({ orderBy: { createdAt: "desc" } }), edit ? db.guidePage.findUnique({ where: { id: edit } }) : null]);
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <form action={saveGuide} className="a-card space-y-3">
        <h1 className="text-xl font-bold">{current ? `Edit: ${current.title}` : "New guide page"}</h1>
        <p className="text-sm text-zinc-500">Shown at <b>/guide/your-slug</b> — privacy policy, refund policy, how-to-use guides… Format: “## Heading”, “- bullet”, blank line = new paragraph.</p>
        <input type="hidden" name="id" value={current?.id || ""} />
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="title" required defaultValue={current?.title} placeholder="Title" className="a-input" />
          <input name="slug" defaultValue={current?.slug} placeholder="slug (e.g. refund-policy)" className="a-input" />
        </div>
        <textarea name="content" rows={18} defaultValue={current?.content} placeholder={"## Section\n\nParagraph text...\n\n- bullet one\n- bullet two"} className="a-input font-mono text-sm" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={current?.active ?? true} /> Published</label>
        <div className="flex gap-2">
          <button className="a-btn">Save page</button>
          {current && <Link href="/admin/guides" className="a-btn-light">+ New instead</Link>}
        </div>
      </form>
      <div className="space-y-3">
        <h2 className="font-semibold">Guide pages ({guides.length})</h2>
        {guides.map((g) => (
          <div key={g.id} className="a-card !p-4">
            <p className="font-semibold">{g.title} {!g.active && <span className="text-xs text-zinc-400">(hidden)</span>}</p>
            <a href={`/guide/${g.slug}`} target="_blank" className="font-mono text-xs text-brand-700">/guide/{g.slug}</a>
            <div className="mt-2 flex gap-2">
              <Link href={`/admin/guides?edit=${g.id}`} className="a-btn-light !py-1">Edit</Link>
              <form action={deleteGuide}><input type="hidden" name="id" value={g.id} /><button className="a-btn-light !py-1 !text-rose-600">Delete</button></form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
