"use client";
export default function PrintButton() {
  return (
    <div className="mt-8 text-center print:hidden">
      <button onClick={() => window.print()} className="a-btn">Print</button>
    </div>
  );
}
