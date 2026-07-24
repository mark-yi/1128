"use server";

import { redirect } from "next/navigation";
import {
  clearAdminSession,
  createAdminSession,
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

export async function logoutAdminAction() {
  await clearAdminSession();
  redirect("/admin/login");
}
