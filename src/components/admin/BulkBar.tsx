"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const formChecks = (form: HTMLFormElement) => Array.from(form.elements).filter((el): el is HTMLInputElement => el instanceof HTMLInputElement && el.type === "checkbox");

const ORDER_OPTIONS: [string, string][] = [
  ["CONFIRMED", "Mark Confirmed"],
  ["PROCESSING", "Mark Processing"],
  ["SHIPPED", "Mark Shipped"],
  ["DELIVERED", "Mark Delivered"],
  ["CANCELLED", "Mark Cancelled"],
  ["RETURNED", "Mark Returned"],
  ["steadfast", "🚚 Send to Steadfast"],
  ["print", "🖨 Print invoices"],
];

/** Floating action bar — appears when rows (.row-check) in the parent form are selected */
export default function BulkBar({ options = ORDER_OPTIONS }: { options?: [string, string][] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    // form.elements also covers checkboxes placed outside the form via form="<id>"
    // setTimeout: the "select all" checkbox updates the rows after this listener runs
    const count = () => setTimeout(() => setN(formChecks(form).filter((c) => c.classList.contains("row-check") && c.checked).length));
    document.addEventListener("change", count);
    return () => document.removeEventListener("change", count);
  }, []);

  const clear = () => {
    const form = ref.current?.closest("form");
    if (form) formChecks(form).forEach((c) => (c.checked = false));
    setN(0);
  };

  return (
    <div ref={ref} className={n ? "fixed inset-x-0 bottom-5 z-30 flex justify-center px-4" : "hidden"}>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-2 pl-4 shadow-2xl shadow-zinc-900/15">
        <span className="text-sm font-semibold">{n} selected</span>
        <select name="bulk" required className="a-input !w-auto !py-1.5">
          <option value="">— choose action —</option>
          {options.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <button className="a-btn !py-1.5">Apply</button>
        <button type="button" onClick={clear} className="grid size-8 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100" aria-label="Clear selection">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
