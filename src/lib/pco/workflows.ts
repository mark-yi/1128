/**
 * Leader-facing workflows composed from People + Services SoT.
 *
 * Two distinct assignment modes (do not conflate):
 * 1) Roster  — PersonTeamPositionAssignment (standing team membership)
 * 2) Schedule — PlanPerson via team_members (this Sunday’s plan)
 */

import { getPerson, listPeople, searchPeople } from "./people";
import {
  assignPersonToTeamPosition,
  getPlanTimes,
  listNeededPositions,
  listPlanTeamMembers,
  listTeamPositions,
  listTeams,
  listUpcomingPlans,
  schedulePersonOnPlan,
} from "./services";
import type { PcoPerson, PcoPlan, SundayBoard } from "./types";
import { isPcoConfigured } from "./http";

export { isPcoConfigured };

/** Candidates for leaders — recent people + search. Refine with PCO lists later. */
export async function listAssignablePeople(query?: string): Promise<PcoPerson[]> {
  if (query?.trim()) return searchPeople(query.trim(), 40);
  return listPeople({ perPage: 40, order: "-created_at" });
}

/** Upcoming Sundays for the configured service type. */
export async function listUpcomingSundays(limit = 4): Promise<PcoPlan[]> {
  return listUpcomingPlans({ limit });
}

/**
 * Team-leader Sunday board: teams, who’s scheduled, what’s still needed.
 */
export async function getSundayBoard(planId: string): Promise<SundayBoard | null> {
  const serviceTypeId = process.env.PCO_SERVICE_TYPE_ID?.trim();
  if (!serviceTypeId) {
    throw new Error("Set PCO_SERVICE_TYPE_ID for Sunday board views");
  }

  const plans = await listUpcomingPlans({ serviceTypeId, limit: 25 });
  const plan = plans.find((p) => p.id === planId);
  if (!plan) {
    // Plan may be outside the small upcoming window — still build from ids
    return null;
  }

  const [times, teams, scheduled, needed] = await Promise.all([
    getPlanTimes(serviceTypeId, planId),
    listTeams(serviceTypeId),
    listPlanTeamMembers(serviceTypeId, planId),
    listNeededPositions(serviceTypeId, planId),
  ]);

  const teamBlocks = await Promise.all(
    teams.map(async (team) => {
      const positions = await listTeamPositions(serviceTypeId, team.id);
      const teamScheduled = scheduled.filter((s) => s.teamId === team.id);
      const teamNeeded = needed.filter((n) => n.teamId === team.id);
      const openSlots = teamNeeded.reduce((sum, n) => sum + n.quantity, 0);
      return {
        team,
        positions,
        scheduled: teamScheduled,
        needed: teamNeeded,
        openSlots,
      };
    }),
  );

  return { plan, times, teams: teamBlocks };
}

/** Add someone to a standing team roster (not a specific Sunday). */
export async function addMemberToTeam(input: {
  personId: string;
  serviceTypeId?: string;
  teamId: string;
  teamPositionId: string;
  schedulePreference?: string;
}) {
  const serviceTypeId =
    input.serviceTypeId || process.env.PCO_SERVICE_TYPE_ID?.trim();
  if (!serviceTypeId) throw new Error("serviceTypeId required");

  const person = await getPerson(input.personId);
  const result = await assignPersonToTeamPosition({
    serviceTypeId,
    teamPositionId: input.teamPositionId,
    personId: input.personId,
    schedulePreference: input.schedulePreference,
  });

  return { ...result, person };
}

/** Put someone on an upcoming Sunday plan for a team/position. */
export async function assignVolunteerToSunday(input: {
  personId: string;
  planId: string;
  teamId: string;
  teamPositionName?: string;
  notify?: boolean;
  notes?: string;
}) {
  const serviceTypeId = process.env.PCO_SERVICE_TYPE_ID?.trim();
  if (!serviceTypeId) throw new Error("Set PCO_SERVICE_TYPE_ID");

  const result = await schedulePersonOnPlan({
    serviceTypeId,
    planId: input.planId,
    personId: input.personId,
    teamId: input.teamId,
    teamPositionName: input.teamPositionName,
    status: "U",
    prepareNotification: input.notify ?? true,
    notes: input.notes,
  });

  return result;
}

/**
 * Gaps across the next N Sundays — good default landing for leaders.
 */
export async function listOpenVolunteerNeeds(sundays = 2) {
  const serviceTypeId = process.env.PCO_SERVICE_TYPE_ID?.trim();
  if (!serviceTypeId) throw new Error("Set PCO_SERVICE_TYPE_ID");

  const plans = await listUpcomingPlans({ serviceTypeId, limit: sundays });
  const boards = [];
  for (const plan of plans) {
    const needed = await listNeededPositions(serviceTypeId, plan.id);
    const scheduled = await listPlanTeamMembers(serviceTypeId, plan.id);
    boards.push({
      plan,
      openSlots: needed.reduce((s, n) => s + n.quantity, 0),
      needed,
      scheduledCount: scheduled.filter((s) => s.status !== "D").length,
    });
  }
  return boards;
}
