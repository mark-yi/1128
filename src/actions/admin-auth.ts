"use server";

import { redirect } from "next/navigation";
import {
  authenticateLeaderOrStaff,
  clearAdminSession,
  createAdminSession,
  createSession,
  verifyAdminLogin,
} from "@/lib/auth";

export async function loginAdminAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!verifyAdminLogin(email, password)) {
    redirect("/admin/login?error=1");
  }

  await createAdminSession(email.trim().toLowerCase());
  redirect("/admin");
}

export async function loginTeamsAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const result = await authenticateLeaderOrStaff(email, password);
  if (!result.ok) {
    redirect(
      result.error === "not_authorized"
        ? "/teams/login?error=unauthorized"
        : "/teams/login?error=1",
    );
  }

  await createSession(result.session);
  redirect("/teams");
}

export async function logoutAdminAction() {
  await clearAdminSession();
  redirect("/admin/login");
}

export async function logoutTeamsAction() {
  await clearAdminSession();
  redirect("/teams/login");
}
