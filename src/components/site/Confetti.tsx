"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const COLORS = ["#da9128", "#0d4524", "#ecb663", "#4a9468", "#f4d29d"];

export default function Confetti() {
  const [pieces, setPieces] = useState<{ x: number; d: number; r: number; c: string; s: number }[]>([]);
  useEffect(() => {
    setPieces(
      Array.from({ length: 60 }, () => ({
        x: Math.random() * 100,
        d: Math.random() * 0.8,
        r: Math.random() * 720 - 360,
        c: COLORS[Math.floor(Math.random() * COLORS.length)],
        s: 6 + Math.random() * 8,
      })),
    );
  }, []);
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute top-0 rounded-sm"
          style={{ left: `${p.x}%`, width: p.s, height: p.s * 0.5, background: p.c }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{ y: "105vh", opacity: [1, 1, 0], rotate: p.r }}
          transition={{ duration: 2.8 + Math.random(), delay: p.d, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}
