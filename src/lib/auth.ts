import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "qf_admin";
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me-dev-secret-change-me");

/** sv = Admin.sessionVersion at sign-in; bumping it in the DB invalidates the token */
export type AdminSession = { id: string; email: string; name: string; role: string; sv?: number };

export async function signSession(s: AdminSession) {
  return new SignJWT(s)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifySession(token?: string): Promise<AdminSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as AdminSession;
  } catch {
    return null;
  }
}
