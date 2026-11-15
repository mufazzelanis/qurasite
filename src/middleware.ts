import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

const YEAR = 60 * 60 * 24 * 365;

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // ── Admin protection ────────────────────────────────
  const isAdminPage = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isAdminApi = pathname.startsWith("/api/admin");
  if (isAdminPage || isAdminApi) {
    const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      if (isAdminApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    return NextResponse.next();
  }

  // ── Visitor session, fbclid → _fbc, UTM attribution ─
  const res = NextResponse.next();
  if (!req.cookies.get("qf_sid")) {
    res.cookies.set("qf_sid", crypto.randomUUID(), { maxAge: YEAR, path: "/", sameSite: "lax" });
  }
  const fbclid = searchParams.get("fbclid");
  if (fbclid) {
    res.cookies.set("_fbc", `fb.1.${Date.now()}.${fbclid}`, { maxAge: 90 * 86400, path: "/", sameSite: "lax" });
  }
  const utmSource = searchParams.get("utm_source");
  if (utmSource) {
    const utm = {
      s: utmSource,
      m: searchParams.get("utm_medium") || "",
      // Facebook ads: utm_campaign={{campaign.id}} (or utm_id / campaign_id)
      c: searchParams.get("utm_campaign") || searchParams.get("utm_id") || searchParams.get("campaign_id") || "",
    };
    res.cookies.set("qf_utm", JSON.stringify(utm), { maxAge: 30 * 86400, path: "/", sameSite: "lax" });
  } else if (fbclid && !req.cookies.get("qf_utm")) {
    res.cookies.set("qf_utm", JSON.stringify({ s: "facebook", m: "paid", c: "" }), { maxAge: 30 * 86400, path: "/" });
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|brand/|uploads/|api/(?!admin)).*)", "/api/admin/:path*"],
};
