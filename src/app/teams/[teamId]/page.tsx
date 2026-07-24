import { notFound, redirect } from "next/navigation";
import {
  canAccessTeam,
  getAccessibleTeams,
  getSession,
} from "@/lib/auth";
import { listPendingVolunteersForTeam } from "@/lib/db";
import {
  listTeamLeaders,
  listTeamPositions,
  listTeamRoster,
} from "@/lib/pco/services";
import { pcoPersonUrl } from "@/lib/pco/people";
import { getTeamByPcoId, TEAMS } from "@/lib/teams";
import { TeamsShell } from "@/components/teams/TeamsShell";
import { PendingQueue } from "@/components/teams/PendingQueue";

export const dynamic = "force-dynamic";

function teamKeyForPcoTeam(teamId: string, teamName: string): string | undefined {
  const mapped = getTeamByPcoId(teamId);
  if (mapped) return mapped.key;

  const needle = teamName.trim().toLowerCase();
  const byName = TEAMS.find(
    (t) =>
      t.label.toLowerCase() === needle ||
      needle.includes(t.key.replace(/_/g, " ")) ||
      t.label.toLowerCase().includes(needle),
  );
  return byName?.key;
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/teams/login");

  const { teamId } = await params;
  const teams = await getAccessibleTeams(session);
  const team = teams.find((t) => t.id === teamId);

  if (!team) {
    const allowed = await canAccessTeam(session, teamId);
    if (!allowed) notFound();
  }

  const active = team ?? teams.find((t) => t.id === teamId);
  if (!active) notFound();

  const serviceTypeId =
    active.serviceTypeId || process.env.PCO_SERVICE_TYPE_ID?.trim() || "";

  const teamKey = teamKeyForPcoTeam(active.id, active.name);

  const [leaders, roster, positions, pending] = await Promise.all([
    listTeamLeaders(active.id),
    listTeamRoster(active.id),
    serviceTypeId
      ? listTeamPositions(serviceTypeId, active.id)
      : Promise.resolve([]),
    listPendingVolunteersForTeam({
      pcoTeamId: active.id,
      teamKey,
      status: "pending",
    }),
  ]);

  const rosterByPosition = new Map<string, typeof roster>();
  for (const row of roster) {
    const key = row.positionName || "Unassigned";
    const list = rosterByPosition.get(key) ?? [];
    list.push(row);
    rosterByPosition.set(key, list);
  }

  return (
    <TeamsShell session={session} teams={teams} activeTeamId={active.id}>
      <header className="mb-8">
        <p className="teams-section-title">Team</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {active.name}
        </h1>
        <p className="mt-1.5 text-sm text-[var(--teams-muted)]">
          Leaders, roster, and people waiting to join.
        </p>
      </header>

      <section className="mb-8">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold">Leaders</h2>
          <span className="text-xs text-[var(--teams-faint)]">
            {leaders.length}
          </span>
        </div>
        <div className="teams-card overflow-hidden">
          {leaders.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--teams-muted)]">
              No Team Leaders set in Planning Center for this team.
            </p>
          ) : (
            leaders.map((leader) => {
              const name =
                leader.person?.name ||
                [leader.person?.firstName, leader.person?.lastName]
                  .filter(Boolean)
                  .join(" ") ||
                "Leader";
              const url = leader.personId
                ? pcoPersonUrl(leader.personId)
                : null;
              return (
                <div key={leader.id} className="teams-row">
                  <div>
                    <p className="text-sm font-medium">{name}</p>
                    <p className="text-xs text-[var(--teams-muted)]">
                      Team leader
                    </p>
                  </div>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[var(--teams-link)]"
                    >
                      Open in PCO
                    </a>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold">Pending</h2>
          <span className="text-xs text-[var(--teams-faint)]">
            {pending.length} waiting
          </span>
        </div>
        <PendingQueue
          pending={pending}
          positions={positions}
          serviceTypeId={serviceTypeId}
        />
        {!teamKey && !getTeamByPcoId(active.id) ? (
          <p className="mt-2 text-xs text-[var(--teams-faint)]">
            Tip: map this team’s id in{" "}
            <code className="rounded bg-[var(--teams-panel)] px-1">
              src/lib/teams.ts
            </code>{" "}
            so form signups land here.
          </p>
        ) : null}
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold">Roster</h2>
          <span className="text-xs text-[var(--teams-faint)]">
            {roster.length} people
          </span>
        </div>
        <div className="teams-card overflow-hidden">
          {roster.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--teams-muted)]">
              No one on the standing roster yet.
            </p>
          ) : (
            Array.from(rosterByPosition.entries()).map(
              ([positionName, people]) => (
                <div key={positionName}>
                  <div className="border-t border-[var(--teams-line)] bg-[var(--teams-panel)] px-4 py-2 first:border-t-0">
                    <p className="text-xs font-medium text-[var(--teams-muted)]">
                      {positionName}
                    </p>
                  </div>
                  {people.map((row) => {
                    const name =
                      row.person?.name ||
                      [row.person?.firstName, row.person?.lastName]
                        .filter(Boolean)
                        .join(" ") ||
                      "Person";
                    const url = row.personId
                      ? pcoPersonUrl(row.personId)
                      : null;
                    return (
                      <div key={row.id} className="teams-row">
                        <p className="text-sm">{name}</p>
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-[var(--teams-link)]"
                          >
                            PCO
                          </a>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ),
            )
          )}
        </div>
      </section>
    </TeamsShell>
  );
}
