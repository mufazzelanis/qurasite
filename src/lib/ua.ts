/** Lightweight user-agent + traffic-source parsing (no dependency). */
export function parseUA(ua: string) {
  const device = /ipad|tablet/i.test(ua) ? "Tablet" : /mobile|android|iphone/i.test(ua) ? "Phone" : "Computer";
  const os = /android (\d+)/i.test(ua)
    ? `Android ${ua.match(/android (\d+)/i)![1]}`
    : /iphone os (\d+)/i.test(ua)
      ? `iOS ${ua.match(/iphone os (\d+)/i)![1]}`
      : /windows/i.test(ua)
        ? "Windows"
        : /mac os/i.test(ua)
          ? "macOS"
          : /linux/i.test(ua)
            ? "Linux"
            : "Other";
  const browser = /FBAN|FBAV|FB_IAB/i.test(ua)
    ? "Facebook app"
    : /Instagram/i.test(ua)
      ? "Instagram app"
      : /TikTok|musical_ly/i.test(ua)
        ? "TikTok app"
        : /Edg\//.test(ua)
          ? "Edge"
          : /OPR\/|Opera/.test(ua)
            ? "Opera"
            : /SamsungBrowser/.test(ua)
              ? "Samsung"
              : /Chrome\//.test(ua)
                ? "Chrome"
                : /Safari\//.test(ua)
                  ? "Safari"
                  : /Firefox\//.test(ua)
                    ? "Firefox"
                    : "Other";
  return { device, os, browser };
}

export function trafficSource(opts: { ua: string; referrer?: string | null; utmSource?: string | null; fbclid?: boolean }) {
  const u = (opts.utmSource || "").toLowerCase();
  if (opts.fbclid || /facebook|fb|instagram|ig|meta/.test(u) || /FBAN|FBAV|Instagram/i.test(opts.ua)) return "facebook";
  if (/google|gclid/.test(u)) return "google";
  if (/tiktok/.test(u) || /TikTok/i.test(opts.ua)) return "tiktok";
  const r = (opts.referrer || "").toLowerCase();
  if (!r) return u ? "other" : "direct";
  if (/facebook|instagram|fb\.com|l\.messenger/.test(r)) return "facebook";
  if (/google\./.test(r)) return "google";
  if (/tiktok/.test(r)) return "tiktok";
  return "other";
}

export const SOURCE_LABEL: Record<string, string> = {
  facebook: "Facebook / Instagram",
  google: "Google",
  tiktok: "TikTok",
  other: "Other sites",
  direct: "Direct / unknown",
};
