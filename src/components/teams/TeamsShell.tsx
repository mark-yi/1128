import Link from "next/link";
import { logoutTeamsAction } from "@/actions/admin-auth";
import type { AppSession } from "@/lib/auth";
import type { PcoTeam } from "@/lib/pco/types";
import { brand } from "@/lib/brand";

export function TeamsShell({
  session,
  teams,
  activeTeamId,
  children,
}: {
  session: AppSession;
  teams: PcoTeam[];
  activeTeamId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="teams-shell">
      <aside className="teams-sidebar">
        <div className="px-2 pb-4">
          <p className="text-sm font-semibold tracking-tight">{brand.name}</p>
          <p className="mt-0.5 text-xs text-[var(--teams-muted)]">Teams</p>
        </div>

        <p className="teams-section-title px-2 mb-2">Your teams</p>
        <nav className="flex flex-col gap-0.5">
          {teams.length === 0 ? (
            <p className="px-2 py-2 text-sm text-[var(--teams-muted)]">
              No teams assigned.
            </p>
          ) : (
            teams.map((team) => {
              const active = team.id === activeTeamId;
              return (
                <Link
                  key={team.id}
                  href={`/teams/${team.id}`}
                  className={`rounded-md px-2.5 py-2 text-sm transition-colors ${
                    active
                      ? "bg-white font-medium text-[var(--teams-text)] shadow-[0_0_0_1px_var(--teams-line)]"
                      : "text-[var(--teams-muted)] hover:bg-white/70 hover:text-[var(--teams-text)]"
                  }`}
                >
                  {team.name}
                </Link>
              );
            })
          )}
        </nav>

        <div className="mt-8 border-t border-[var(--teams-line)] px-2 pt-4">
          <p className="truncate text-xs text-[var(--teams-muted)]">
            {session.email}
          </p>
          <p className="mt-0.5 text-[11px] uppercase tracking-wide text-[var(--teams-faint)]">
            {session.role}
          </p>
          {session.role === "staff" ? (
            <Link
              href="/admin"
              className="mt-3 block text-xs text-[var(--teams-link)]"
            >
              Submissions
            </Link>
          ) : null}
          <form action={logoutTeamsAction} className="mt-3">
            <button
              type="submit"
              className="text-xs text-[var(--teams-muted)] underline-offset-2 hover:underline"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="teams-main">{children}</div>
    </div>
  );
}
