import Image from "next/image";
import type { LandingDesign } from "@/lib/landing-designs";
import { cn } from "@/lib/utils";

/** Mini wireframe of a landing design in its real colors (works in server and client components) */
export default function DesignMock({ d, image, primary, accent, className }: { d: LandingDesign; image?: string; primary?: string; accent?: string; className?: string }) {
  const p = primary || d.primary;
  const a = accent || d.accent;
  const { bg, surface, text } = d.preview;
  const line = (w: string, h = 6, c = text, o = 0.85) => <span className="block rounded-full" style={{ width: w, height: h, background: c, opacity: o }} />;
  const img = (cls: string, style?: React.CSSProperties) => (
    <span className={cn("relative block overflow-hidden", cls)} style={{ background: surface, ...style }}>
      {image && <Image src={image} alt="" fill sizes="160px" className="object-contain p-1.5" />}
    </span>
  );
  const btn = <span className="block h-3.5 w-16 rounded-full shadow-sm" style={{ background: a }} />;

  return (
    <div className={cn("relative aspect-[16/10] overflow-hidden", className)} style={{ background: bg }}>
      {/* header */}
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${text}12` }}>
        {line("28px", 6, p, 1)}
        <span className="block h-2.5 w-9 rounded-full" style={{ background: a }} />
      </div>

      {d.hero === "centered" && (
        <div className="flex flex-col items-center gap-1.5 px-6 pt-3">
          {line("60%", 7)}
          {line("45%", 7, a, 1)}
          {line("70%", 4, text, 0.35)}
          {btn}
          {img("mt-1 h-[38%] w-[70%] rounded-lg", { boxShadow: `0 8px 20px -10px ${p}` })}
        </div>
      )}

      {d.hero === "bold" && (
        <>
          <div className="py-1 text-center" style={{ background: p }}>
            {line("40%", 4, "#fff", 0.9)}
          </div>
          <div className="grid grid-cols-[1.1fr_1fr] items-center gap-2 px-3 pt-2.5">
            <div className="space-y-1.5">
              <span className="block h-2.5 w-14 -rotate-2 rounded" style={{ background: a }} />
              {line("95%", 8)}
              {line("80%", 8, a, 1)}
              {line("50%", 9, p, 1)}
              <span className="block h-3.5 w-20 rounded-full" style={{ background: a }} />
            </div>
            <div className="relative">
              {img("aspect-square w-full rounded-xl", { outline: `3px solid ${a}` })}
              <span className="absolute -top-1.5 -right-1.5 grid size-8 rotate-12 place-items-center rounded-full text-[8px] font-bold text-white" style={{ background: p }}>
                %
              </span>
            </div>
          </div>
        </>
      )}

      {d.hero === "luxe" && (
        <div className="relative grid grid-cols-2 items-center gap-2 px-3 pt-3">
          <span className="absolute top-0 left-[10%] h-full w-[45%] rounded-full blur-xl" style={{ background: `${a}33` }} />
          <span className="relative mx-auto block aspect-square w-[78%] rounded-full" style={{ border: `1px solid ${a}55` }}>
            {img("absolute inset-[12%] rounded-full", { background: "transparent" })}
          </span>
          <div className="relative space-y-1.5">
            {line("40%", 3, a, 1)}
            {line("90%", 7)}
            {line("75%", 7, a, 1)}
            {line("85%", 3, text, 0.35)}
            {btn}
          </div>
        </div>
      )}

      {d.hero === "story" && (
        <div className="px-3 pt-2.5">
          <div className="grid grid-cols-[1.1fr_1fr] items-center gap-2 rounded-xl p-2.5" style={{ background: `${p}22` }}>
            <div className="space-y-1.5">
              {line("85%", 7)}
              {line("70%", 7, a, 1)}
              <span className="block rounded-md p-1" style={{ background: `${surface}cc` }}>
                {line("90%", 3, text, 0.4)}
              </span>
              <span className="block h-3.5 w-16 rounded-full" style={{ background: a }} />
            </div>
            {img("aspect-[4/5] w-full rotate-2 rounded-lg shadow-md")}
          </div>
        </div>
      )}

      {(d.hero === "orbit" || !["centered", "bold", "luxe", "story"].includes(d.hero)) && (
        <div className="grid grid-cols-2 items-center gap-2 px-3 pt-3">
          <div className="space-y-1.5">
            <span className="block h-2.5 w-14 rounded-full" style={{ background: `${a}33` }} />
            {line("90%", 7)}
            {line("75%", 7, a, 1)}
            {line("85%", 3, text, 0.35)}
            {btn}
          </div>
          <span className="relative mx-auto block aspect-square w-[85%] rounded-full" style={{ border: `2px dashed ${a}88` }}>
            {img("absolute inset-[12%] rounded-full", { boxShadow: `0 10px 25px -12px ${p}` })}
            <span className="absolute top-[30%] -right-1 size-5 rotate-12 rounded-full" style={{ background: p }} />
          </span>
        </div>
      )}

      {/* section stub */}
      <div className="absolute inset-x-3 bottom-2 grid grid-cols-4 gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="block h-4 rounded-md" style={{ background: surface, boxShadow: `0 2px 6px -3px ${text}40` }} />
        ))}
      </div>
    </div>
  );
}
