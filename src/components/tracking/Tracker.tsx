"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

type W = Window & { __qfPv?: string; __qfVisit?: string; __qfFirstPv?: boolean; fbq?: (...a: unknown[]) => void };

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

function beacon(body: object) {
  const data = JSON.stringify(body);
  if (navigator.sendBeacon) navigator.sendBeacon("/api/t", new Blob([data], { type: "application/json" }));
  else fetch("/api/t", { method: "POST", body: data, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
}

/**
 * Tiny visitor tracker (~1 KB, no libraries):
 * visit start · stage (top / reading / order form) · scroll · time on page · leave · button clicks.
 * Buttons opt in with data-track="order_button" (and optional data-amount).
 */
export default function Tracker({ slug = null }: { slug?: string | null }) {
  const path = usePathname();

  useEffect(() => {
    const w = window as W;
    const t0 = Date.now();
    let id: string | null = null;
    let stage = "top";
    let maxScroll = 0;
    let formVisible = false;

    // PageView id: first load reuses the id the pixel already fired with (dedup); SPA navigations get a new one
    let eventId = w.__qfPv || (w.__qfPv = uid());
    if (w.__qfFirstPv) {
      eventId = uid();
      try {
        w.fbq?.("track", "PageView", {}, { eventID: eventId });
      } catch {}
    }
    w.__qfFirstPv = true;

    const sec = () => Math.round((Date.now() - t0) / 1000);
    const ready = fetch("/api/t", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "start", path, slug, referrer: document.referrer, eventId, url: location.href, fbclid: location.search.includes("fbclid") }),
    })
      .then((r) => r.json())
      .then((j) => {
        id = j.id;
        w.__qfVisit = j.id;
      })
      .catch(() => {});

    const computeStage = () => {
      const h = document.documentElement;
      const pct = Math.round(((h.scrollTop + innerHeight) / Math.max(1, h.scrollHeight)) * 100);
      maxScroll = Math.max(maxScroll, pct);
      stage = formVisible ? "form" : h.scrollTop > innerHeight * 0.5 ? "reading" : "top";
    };
    const onScroll = () => computeStage();
    addEventListener("scroll", onScroll, { passive: true });

    const form = document.getElementById("order");
    const io = form
      ? new IntersectionObserver(([e]) => {
          formVisible = e.isIntersecting;
          computeStage();
        }, { threshold: 0.15 })
      : null;
    if (form && io) io.observe(form);

    const ping = () => id && beacon({ type: "ping", id, stage, scroll: maxScroll, dur: sec() });
    const timer = setInterval(() => document.visibilityState === "visible" && ping(), 10000);

    const onHide = () => {
      if (document.visibilityState === "hidden" && id) beacon({ type: "leave", id, stage, scroll: maxScroll, dur: sec() });
    };
    document.addEventListener("visibilitychange", onHide);
    addEventListener("pagehide", onHide);

    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest?.("[data-track]") as HTMLElement | null;
      if (!el) return;
      const send = () =>
        beacon({
          type: "click",
          id,
          slug,
          path,
          button: el.dataset.track,
          label: (el.dataset.label || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60),
          amount: el.dataset.amount,
          after: sec(),
        });
      if (id) send();
      else ready.then(send);
    };
    document.addEventListener("click", onClick, true);

    return () => {
      clearInterval(timer);
      removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onHide);
      removeEventListener("pagehide", onHide);
      document.removeEventListener("click", onClick, true);
      io?.disconnect();
      if (id) beacon({ type: "leave", id, stage, scroll: maxScroll, dur: sec() });
    };
  }, [path, slug]);

  return null;
}
