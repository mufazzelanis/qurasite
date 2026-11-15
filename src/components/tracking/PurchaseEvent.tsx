"use client";
import { useEffect } from "react";
import { track } from "@/lib/track-client";

/** Browser-side Purchase with the same event_id the server already sent via CAPI. */
export default function PurchaseEvent(p: { eventId: string; value: number; contentIds: string[]; numItems: number }) {
  useEffect(() => {
    const key = `qf_purchase_${p.eventId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    track("Purchase", { value: p.value, contentIds: p.contentIds, numItems: p.numItems }, { eventId: p.eventId, serverSent: true });
  }, [p.eventId, p.value, p.contentIds, p.numItems]);
  return null;
}
