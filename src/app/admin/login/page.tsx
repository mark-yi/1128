import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { loginAdminAction } from "@/actions/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getAdminSession();
  if (session) redirect("/admin");

  const params = await searchParams;
  const errored = params.error === "1";

  return (
    <div className="form-shell flex min-h-dvh items-center justify-center px-5 py-12">
      <form
        action={loginAdminAction}
        className="w-full max-w-md border border-[var(--color-line)] bg-white/70 p-8"
      >
        <p className="font-display text-2xl text-[var(--color-accent-dark)]">1128</p>
        <h1 className="mt-2 font-display text-3xl text-[var(--color-text)]">Staff login</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Allowlisted email + shared admin password.
        </p>

        {errored ? (
          <p className="mt-4 text-sm text-[var(--color-danger)]" role="alert">
            Invalid email or password.
          </p>
        ) : null}

        <label className="mt-6 block text-sm text-[var(--color-text-soft)]">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            className="mt-1 w-full border-b-2 border-[var(--color-line-strong)] bg-transparent py-2 text-base outline-none focus:border-[var(--color-accent)]"
          />
        </label>

        <label className="mt-5 block text-sm text-[var(--color-text-soft)]">
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full border-b-2 border-[var(--color-line-strong)] bg-transparent py-2 text-base outline-none focus:border-[var(--color-accent)]"
          />
        </label>

        <button type="submit" className="btn-primary mt-8 inline-flex min-h-11 w-full items-center justify-center px-4">
          Sign in
        </button>
      </form>
    </div>
  );
}
