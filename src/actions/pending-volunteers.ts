"use server";

import { revalidatePath } from "next/cache";
import {
  getPendingVolunteer,
  listPendingVolunteersForTeam,
  updatePendingVolunteerStatus,
} from "@/lib/db";
import {
  canAccessTeam,
  getSession,
} from "@/lib/auth";
import { addMemberToTeam } from "@/lib/pco/workflows";
import { setPersonMembership } from "@/lib/pco/people";
import { getTeamByKey, getTeamByPcoId } from "@/lib/teams";

export async function listPendingForTeamAction(input: {
  pcoTeamId: string;
  teamKey?: string;
}) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "Unauthorized" };

  const allowed = await canAccessTeam(session, input.pcoTeamId);
  if (!allowed && session.role !== "staff") {
    // Allow staff always; leaders need team match. If team id empty (unmapped),
    // fall through for staff only.
    if (input.pcoTeamId) {
      return { ok: false as const, error: "Forbidden" };
    }
  }

  const teamMeta =
    getTeamByPcoId(input.pcoTeamId) ??
    (input.teamKey ? getTeamByKey(input.teamKey) : undefined);

  const rows = await listPendingVolunteersForTeam({
    pcoTeamId: input.pcoTeamId || undefined,
    teamKey: input.teamKey ?? teamMeta?.key,
    status: "pending",
  });

  return { ok: true as const, rows };
}

export async function acceptPendingVolunteerAction(input: {
  pendingId: string;
  teamPositionId: string;
  serviceTypeId?: string;
}) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "Unauthorized" };

  const pending = await getPendingVolunteer(input.pendingId);
  if (!pending || pending.status !== "pending") {
    return { ok: false as const, error: "Pending volunteer not found" };
  }

  if (pending.pcoTeamId) {
    const allowed = await canAccessTeam(session, pending.pcoTeamId);
    if (!allowed) return { ok: false as const, error: "Forbidden" };
  } else if (session.role !== "staff") {
    return { ok: false as const, error: "Team not mapped in PCO yet" };
  }

  if (!pending.pcoTeamId) {
    return {
      ok: false as const,
      error: "Map this team’s pcoTeamId in src/lib/teams.ts before accepting",
    };
  }

  try {
    await addMemberToTeam({
      personId: pending.pcoPersonId,
      teamId: pending.pcoTeamId,
      teamPositionId: input.teamPositionId,
      serviceTypeId: input.serviceTypeId,
    });
    // Placed on a team → Member (was Newcomer / Regular Attender post-Pathway)
    await setPersonMembership(pending.pcoPersonId, "Member");
  } catch (err) {
    console.error("[pending] accept failed", err);
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Failed to add to team",
    };
  }

  await updatePendingVolunteerStatus({
    id: pending.id,
    status: "accepted",
    reviewedByEmail: session.email,
    acceptedPositionId: input.teamPositionId,
  });

  revalidatePath("/teams");
  revalidatePath(`/teams/${pending.pcoTeamId}`);

  return { ok: true as const };
}

export async function dismissPendingVolunteerAction(pendingId: string) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "Unauthorized" };

  const pending = await getPendingVolunteer(pendingId);
  if (!pending || pending.status !== "pending") {
    return { ok: false as const, error: "Pending volunteer not found" };
  }

  if (pending.pcoTeamId) {
    const allowed = await canAccessTeam(session, pending.pcoTeamId);
    if (!allowed) return { ok: false as const, error: "Forbidden" };
  } else if (session.role !== "staff") {
    return { ok: false as const, error: "Forbidden" };
  }

  await updatePendingVolunteerStatus({
    id: pending.id,
    status: "dismissed",
    reviewedByEmail: session.email,
  });

  revalidatePath("/teams");
  if (pending.pcoTeamId) revalidatePath(`/teams/${pending.pcoTeamId}`);

  return { ok: true as const };
}
