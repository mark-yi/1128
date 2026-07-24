import { redirect } from "next/navigation";
import { getAccessibleTeams, getSession } from "@/lib/auth";
import { TeamsShell } from "@/components/teams/TeamsShell";
import { isPcoConfigured } from "@/lib/pco/http";

export const dynamic = "force-dynamic";

export default async function TeamsIndexPage() {
  const session = await getSession();
  if (!session) redirect("/teams/login");

  const teams = await getAccessibleTeams(session);

  if (teams.length > 0) {
    redirect(`/teams/${teams[0].id}`);
  }

  return (
    <TeamsShell session={session} teams={teams}>
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold tracking-tight">No teams yet</h1>
        <p className="mt-2 text-sm text-[var(--teams-muted)]">
          {isPcoConfigured()
            ? session.role === "staff"
              ? "No Service Type teams found. Set PCO_SERVICE_TYPE_ID and confirm teams exist in Planning Center Services."
              : "You’re signed in, but Planning Center doesn’t list you as a Team Leader on any team."
            : "PCO isn’t configured (PCO_APP_ID / PCO_SECRET). Add credentials to load teams."}
        </p>
      </div>
    </TeamsShell>
  );
}
