"use client";
import { useEffect, useRef, type ReactNode } from "react";

/** <details> dropdown that closes on outside click, Escape, or after picking an item */
export default function Dropdown({ summary, summaryClassName, children, className }: { summary: ReactNode; summaryClassName?: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: Event) => {
      const d = ref.current;
      if (!d?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !d.contains(e.target as Node)) d.open = false;
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  return (
    <details ref={ref} className={className} onSubmit={() => ref.current && (ref.current.open = false)}>
      <summary className={summaryClassName}>{summary}</summary>
      {children}
    </details>
  );
}
