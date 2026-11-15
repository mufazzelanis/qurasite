"use client";
import { useEffect } from "react";
import { track } from "@/lib/track-client";

export default function ViewContent({ id, name, value }: { id: string; name: string; value: number }) {
  useEffect(() => {
    const t = setTimeout(() => track("ViewContent", { value, contentIds: [id], contentName: name }), 800);
    return () => clearTimeout(t);
  }, [id, name, value]);
  return null;
}
