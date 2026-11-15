import { requireAdmin } from "@/lib/session";
import { Eye, EyeOff, Star, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { deleteReview, saveReview, toggleReview } from "@/app/admin/actions";

export default async function ReviewsPage() {
  await requireAdmin("marketing");
  const reviews = await db.review.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <form action={saveReview} className="a-card h-fit space-y-3">
        <h2 className="font-semibold">Add review</h2>
        <input name="name" required placeholder="Customer name" className="a-input" />
        <input name="location" placeholder="Location (e.g. ঢাকা)" className="a-input" />
        <select name="rating" defaultValue="5" className="a-input">{[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} stars</option>)}</select>
        <textarea name="text" required rows={4} placeholder="Review text" className="a-input" />
        <button className="a-btn">Add review</button>
      </form>
      <div className="space-y-3 xl:col-span-2">
        <h1 className="text-2xl font-bold">Reviews ({reviews.length})</h1>
        {reviews.map((r) => (
          <div key={r.id} className={`a-card flex gap-4 ${r.active ? "" : "opacity-50"}`}>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{r.name}</p>
                <span className="text-xs text-zinc-400">{r.location}</span>
                <span className="flex text-gold-500">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="size-3.5 fill-current" />)}</span>
              </div>
              <p className="mt-1 text-sm text-zinc-600">{r.text}</p>
            </div>
            <div className="flex gap-2">
              <form action={toggleReview}><input type="hidden" name="id" value={r.id} /><button className="a-btn-light !py-1.5" title="Show / hide">{r.active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</button></form>
              <form action={deleteReview}><input type="hidden" name="id" value={r.id} /><button className="a-btn-light !py-1.5 !text-rose-600"><Trash2 className="size-4" /></button></form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
