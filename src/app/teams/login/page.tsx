import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { loginTeamsAction } from "@/actions/admin-auth";

export const dynamic = "force-dynamic";

export default async function TeamsLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/teams");

  const params = await searchParams;
  const errored = params.error === "1";
  const unauthorized = params.error === "unauthorized";

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--teams-panel)] px-5 py-12">
      <form
        action={loginTeamsAction}
        className="teams-card w-full max-w-sm p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      >
        <p className="text-sm font-semibold tracking-tight text-[var(--teams-text)]">
          {brand.name}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Team leaders
        </h1>
        <p className="mt-2 text-sm text-[var(--teams-muted)]">
          Sign in with your church email. Staff and PCO team leaders only.
        </p>

        {errored ? (
          <p className="mt-4 text-sm text-[var(--teams-danger)]" role="alert">
            Invalid email or password.
          </p>
        ) : null}
        {unauthorized ? (
          <p className="mt-4 text-sm text-[var(--teams-danger)]" role="alert">
            You’re not listed as a team leader in Planning Center.
          </p>
        ) : null}

        <label className="mt-6 block text-sm text-[var(--teams-muted)]">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            className="teams-input mt-1.5"
          />
        </label>

        <label className="mt-4 block text-sm text-[var(--teams-muted)]">
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="teams-input mt-1.5"
          />
        </label>

        <button type="submit" className="teams-btn teams-btn-primary mt-6 w-full">
          Sign in
        </button>

        <p className="mt-5 text-center text-xs text-[var(--teams-faint)]">
          Staff submissions →{" "}
          <Link href="/admin/login" className="text-[var(--teams-link)]">
            /admin
          </Link>
        </p>
      </form>
    </div>
  );
}
