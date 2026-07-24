import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { findPersonByEmail, isPcoConfigured } from "@/lib/pco/people";
import { listTeams, listTeamsLedByPerson } from "@/lib/pco/services";
import type { PcoTeam } from "@/lib/pco/types";

const COOKIE = "1128_admin_session";

export type SessionRole = "staff" | "leader";

export type AppSession = {
  email: string;
  role: SessionRole;
  pcoPersonId?: string;
};

function secretKey() {
  const secret =
    process.env.AUTH_SECRET ?? process.env.ADMIN_PASSWORD ?? "dev-only-secret-change-me";
  return new TextEncoder().encode(secret);
}

export function getAdminAllowlist(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "yimark56@gmail.com";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isStaffEmail(email: string): boolean {
  return getAdminAllowlist().includes(email.trim().toLowerCase());
}

function expectedPassword() {
  return process.env.ADMIN_PASSWORD ?? "1128-admin";
}

export async function createSession(input: {
  email: string;
  role: SessionRole;
  pcoPersonId?: string;
}) {
  const token = await new SignJWT({
    email: input.email,
    role: input.role,
    pcoPersonId: input.pcoPersonId,
  })
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

/** @deprecated use createSession — kept for admin login */
export async function createAdminSession(email: string) {
  await createSession({ email, role: "staff" });
}

export async function clearAdminSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<AppSession | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const email = typeof payload.email === "string" ? payload.email : null;
    if (!email) return null;
    const role =
      payload.role === "leader" || payload.role === "staff"
        ? payload.role
        : isStaffEmail(email)
          ? "staff"
          : "leader";
    const pcoPersonId =
      typeof payload.pcoPersonId === "string" ? payload.pcoPersonId : undefined;

    if (role === "staff" && !isStaffEmail(email)) return null;
    return { email, role, pcoPersonId };
  } catch {
    return null;
  }
}

/** Staff-only session (admin UI). */
export async function getAdminSession(): Promise<{ email: string } | null> {
  const session = await getSession();
  if (!session || session.role !== "staff") return null;
  return { email: session.email };
}

export function verifyAdminLogin(email: string, password: string): boolean {
  if (!isStaffEmail(email)) return false;
  return password === expectedPassword();
}

/**
 * Staff or PCO team leader may sign in with the shared password.
 * Returns session payload or an error reason.
 */
export async function authenticateLeaderOrStaff(
  email: string,
  password: string,
): Promise<
  | { ok: true; session: AppSession }
  | { ok: false; error: "invalid_credentials" | "not_authorized" }
> {
  if (password !== expectedPassword()) {
    return { ok: false, error: "invalid_credentials" };
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized) return { ok: false, error: "invalid_credentials" };

  if (isStaffEmail(normalized)) {
    return { ok: true, session: { email: normalized, role: "staff" } };
  }

  if (!isPcoConfigured()) {
    // Dev without PCO: only staff allowlist
    return { ok: false, error: "not_authorized" };
  }

  const person = await findPersonByEmail(normalized);
  if (!person) return { ok: false, error: "not_authorized" };

  const teams = await listTeamsLedByPerson(person.id);
  if (teams.length === 0) return { ok: false, error: "not_authorized" };

  return {
    ok: true,
    session: {
      email: normalized,
      role: "leader",
      pcoPersonId: person.id,
    },
  };
}

/** Teams the session may manage. */
export async function getAccessibleTeams(
  session: AppSession,
): Promise<PcoTeam[]> {
  if (session.role === "staff") {
    return listTeams();
  }

  if (!session.pcoPersonId) {
    const person = await findPersonByEmail(session.email);
    if (!person) return [];
    return listTeamsLedByPerson(person.id);
  }

  return listTeamsLedByPerson(session.pcoPersonId);
}

export async function canAccessTeam(
  session: AppSession,
  teamId: string,
): Promise<boolean> {
  if (session.role === "staff") return true;
  const teams = await getAccessibleTeams(session);
  return teams.some((t) => t.id === teamId);
}
