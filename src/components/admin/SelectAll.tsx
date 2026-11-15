"use client";

/** Header checkbox that toggles every .row-check in the same form */
export default function SelectAll() {
  return (
    <input
      type="checkbox"
      aria-label="Select all"
      className="size-4"
      onChange={(e) => e.currentTarget.form?.querySelectorAll<HTMLInputElement>(".row-check").forEach((c) => (c.checked = e.currentTarget.checked))}
    />
  );
}
