import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "1128_admin_session";

function secretKey() {
  const secret = process.env.AUTH_SECRET ?? process.env.ADMIN_PASSWORD ?? "dev-only-secret-change-me";
  return new TextEncoder().encode(secret);
}

export function getAdminAllowlist(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "yimark56@gmail.com";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function createAdminSession(email: string) {
  const token = await new SignJWT({ email, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAdminSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getAdminSession(): Promise<{ email: string } | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const email = typeof payload.email === "string" ? payload.email : null;
    if (!email) return null;
    if (!getAdminAllowlist().includes(email.toLowerCase())) return null;
    return { email };
  } catch {
    return null;
  }
}

export function verifyAdminLogin(email: string, password: string): boolean {
  const allow = getAdminAllowlist();
  if (!allow.includes(email.trim().toLowerCase())) return false;
  const expected = process.env.ADMIN_PASSWORD ?? "1128-admin";
  return password === expected;
}
