"use client";
import { useState } from "react";
import { Play } from "lucide-react";

const ytId = (u: string) => u.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)?.[1] || (/^[\w-]{11}$/.test(u) ? u : null);

/** YouTube that loads only on tap — keeps the landing page fast. */
export default function LiteVideo({ url }: { url: string }) {
  const [play, setPlay] = useState(false);
  const id = ytId(url);
  if (!id) return null;
  return (
    <div className="relative aspect-video overflow-hidden rounded-3xl bg-black shadow-2xl">
      {play ? (
        <iframe className="absolute inset-0 size-full" src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen title="Video" />
      ) : (
        <button onClick={() => setPlay(true)} className="group absolute inset-0" aria-label="Play video">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" className="size-full object-cover opacity-90" />
          <span className="absolute left-1/2 top-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-gold-500 text-white shadow-2xl transition group-hover:scale-110">
            <Play className="size-8 fill-current" />
          </span>
        </button>
      )}
    </div>
  );
}
