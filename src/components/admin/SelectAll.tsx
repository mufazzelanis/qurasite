"use client";

/** Header checkbox that toggles every .row-check in the same form (including inputs linked with form="<id>") */
export default function SelectAll({ form, className = "size-4" }: { form?: string; className?: string }) {
  return (
    <input
      type="checkbox"
      form={form}
      aria-label="Select all"
      className={className}
      onChange={(e) => {
        const f = e.currentTarget.form;
        if (!f) return;
        for (const el of Array.from(f.elements)) if (el instanceof HTMLInputElement && el.classList.contains("row-check")) el.checked = e.currentTarget.checked;
      }}
    />
  );
}
