"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

/** Floating action bar — appears when rows (.row-check) in the parent form are selected */
export default function BulkBar() {
  const ref = useRef<HTMLDivElement>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    // setTimeout: the "select all" checkbox updates the rows after this listener runs
    const count = () => setTimeout(() => setN(form.querySelectorAll<HTMLInputElement>(".row-check:checked").length));
    form.addEventListener("change", count);
    return () => form.removeEventListener("change", count);
  }, []);

  const clear = () => {
    const form = ref.current?.closest("form");
    form?.querySelectorAll<HTMLInputElement>("input[type=checkbox]").forEach((c) => (c.checked = false));
    setN(0);
  };

  return (
    <div ref={ref} className={n ? "fixed inset-x-0 bottom-5 z-30 flex justify-center px-4" : "hidden"}>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-2 pl-4 shadow-2xl shadow-zinc-900/15">
        <span className="text-sm font-semibold">{n} selected</span>
        <select name="bulk" required className="a-input !w-auto !py-1.5">
          <option value="">— choose action —</option>
          <option value="CONFIRMED">Mark Confirmed</option>
          <option value="PROCESSING">Mark Processing</option>
          <option value="SHIPPED">Mark Shipped</option>
          <option value="DELIVERED">Mark Delivered</option>
          <option value="CANCELLED">Mark Cancelled</option>
          <option value="RETURNED">Mark Returned</option>
          <option value="steadfast">🚚 Send to Steadfast</option>
          <option value="print">🖨 Print invoices</option>
        </select>
        <button className="a-btn !py-1.5">Apply</button>
        <button type="button" onClick={clear} className="grid size-8 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100" aria-label="Clear selection">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
