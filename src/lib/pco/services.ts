import { isPcoConfigured, pcoListAll, pcoRequest, qs, type PcoListResponse, type PcoSingleResponse } from "./http";
import type {
  PcoNeededPosition,
  PcoPlan,
  PcoPlanAssignment,
  PcoPlanTime,
  PcoServiceType,
  PcoTeam,
  PcoTeamPosition,
  PcoTeamRosterAssignment,
} from "./types";

type ServiceTypeAttrs = { name?: string; frequency?: string };
type TeamAttrs = { name?: string; archived_at?: string | null };
type PositionAttrs = { name?: string; sequence?: number };
type PlanAttrs = {
  title?: string | null;
  dates?: string;
  short_dates?: string;
  sort_date?: string;
  planning_center_url?: string;
  needed_positions_count?: number;
  plan_people_count?: number;
};
type PlanTimeAttrs = {
  starts_at?: string;
  ends_at?: string;
  time_type?: string;
};
type PlanPersonAttrs = {
  status?: string;
  team_position_name?: string;
  name?: string;
};
type NeededAttrs = {
  quantity?: number;
  team_position_name?: string;
};
type RosterAttrs = {
  schedule_preference?: string;
};

function defaultServiceTypeId() {
  return process.env.PCO_SERVICE_TYPE_ID?.trim() || null;
}

export async function listServiceTypes(): Promise<PcoServiceType[]> {
  if (!isPcoConfigured()) return [];
  const rows = await pcoListAll<ServiceTypeAttrs>("services", "/service_types", {
    perPage: 100,
    maxPages: 5,
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.attributes.name ?? "Untitled",
    frequency: r.attributes.frequency,
  }));
}

export async function listTeams(serviceTypeId?: string): Promise<PcoTeam[]> {
  if (!isPcoConfigured()) return [];
  const st = serviceTypeId || defaultServiceTypeId();
  if (!st) {
    // Fall back to org-level teams list
    const rows = await pcoListAll<TeamAttrs>("services", "/teams", {
      perPage: 100,
      maxPages: 10,
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.attributes.name ?? "Team",
      serviceTypeId: "",
      archivedAt: r.attributes.archived_at,
    }));
  }

  const rows = await pcoListAll<TeamAttrs>(
    "services",
    `/service_types/${st}/teams`,
    { perPage: 100, maxPages: 10 },
  );
  return rows
    .filter((r) => !r.attributes.archived_at)
    .map((r) => ({
      id: r.id,
      name: r.attributes.name ?? "Team",
      serviceTypeId: st,
      archivedAt: r.attributes.archived_at,
    }));
}

export async function listTeamPositions(
  serviceTypeId: string,
  teamId: string,
): Promise<PcoTeamPosition[]> {
  if (!isPcoConfigured()) return [];

  // Canonical path: /teams/{team_id}/team_positions (also works nested under service type).
  void serviceTypeId;
  const rows = await pcoListAll<PositionAttrs>(
    "services",
    `/teams/${teamId}/team_positions`,
    { perPage: 100, maxPages: 5 },
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.attributes.name ?? "Position",
    teamId,
    sequence: r.attributes.sequence ?? undefined,
  }));
}

/**
 * Standing roster: people assigned to a team position (not yet a Sunday schedule).
 * This is “add new member to the worship team”.
 */
export async function listTeamRoster(
  teamId: string,
): Promise<PcoTeamRosterAssignment[]> {
  if (!isPcoConfigured()) return [];
  const res = await pcoRequest<PcoListResponse<RosterAttrs>>(
    "services",
    `/teams/${teamId}/person_team_position_assignments${qs({
      include: "person,team_position",
      per_page: 100,
    })}`,
  );

  return (res.data ?? []).map((row) => {
    const personRel = row.relationships?.person?.data;
    const posRel = row.relationships?.team_position?.data;
    const personId = !Array.isArray(personRel) && personRel ? personRel.id : "";
    const teamPositionId = !Array.isArray(posRel) && posRel ? posRel.id : "";
    const personInc = (res.included ?? []).find(
      (i) => i.type === "Person" && i.id === personId,
    );
    const posInc = (res.included ?? []).find(
      (i) => i.type === "TeamPosition" && i.id === teamPositionId,
    );
    const attrs = personInc?.attributes as
      | { first_name?: string; last_name?: string; full_name?: string; name?: string }
      | undefined;

    return {
      id: row.id,
      personId,
      teamPositionId,
      schedulePreference: row.attributes.schedule_preference,
      positionName: (posInc?.attributes as { name?: string } | undefined)?.name,
      person: personInc
        ? {
            id: personId,
            firstName: attrs?.first_name ?? "",
            lastName: attrs?.last_name ?? "",
            name:
              attrs?.full_name ||
              attrs?.name ||
              [attrs?.first_name, attrs?.last_name].filter(Boolean).join(" "),
          }
        : undefined,
    };
  });
}

/** Add a person to a team position roster (Services SoT). */
export async function assignPersonToTeamPosition(input: {
  serviceTypeId: string;
  teamPositionId: string;
  personId: string;
  schedulePreference?: string;
}): Promise<{ id: string; mocked: boolean }> {
  if (!isPcoConfigured()) {
    return { id: `mock_roster_${input.personId}`, mocked: true };
  }

  const res = await pcoRequest<PcoSingleResponse<RosterAttrs>>(
    "services",
    `/service_types/${input.serviceTypeId}/team_positions/${input.teamPositionId}/person_team_position_assignments`,
    {
      method: "POST",
      body: JSON.stringify({
        data: {
          type: "PersonTeamPositionAssignment",
          attributes: {
            person_id: input.personId,
            schedule_preference: input.schedulePreference ?? "Every week",
          },
        },
      }),
    },
  );

  return { id: res.data.id, mocked: false };
}

export async function listUpcomingPlans(options?: {
  serviceTypeId?: string;
  after?: string; // ISO — requires filter=after
  before?: string;
  limit?: number;
}): Promise<PcoPlan[]> {
  if (!isPcoConfigured()) return [];
  const st = options?.serviceTypeId || defaultServiceTypeId();
  if (!st) throw new Error("PCO_SERVICE_TYPE_ID is required to list plans");

  // Live API: filter=future works standalone; filter=after requires companion `after=`.
  const filter = options?.after ? "after" : options?.before ? "before" : "future";
  const res = await pcoRequest<PcoListResponse<PlanAttrs>>(
    "services",
    `/service_types/${st}/plans${qs({
      filter,
      after: options?.after,
      before: options?.before,
      order: "sort_date",
      per_page: options?.limit ?? 10,
      include: "plan_times",
    })}`,
  );

  return (res.data ?? []).map((plan) => ({
    id: plan.id,
    serviceTypeId: st,
    title: plan.attributes.title ?? null,
    dates: plan.attributes.dates ?? "",
    shortDates: plan.attributes.short_dates ?? "",
    sortDate: plan.attributes.sort_date ?? "",
    planningCenterUrl: plan.attributes.planning_center_url,
    neededPositionsCount: plan.attributes.needed_positions_count,
    planPeopleCount: plan.attributes.plan_people_count,
  }));
}

export async function getPlanTimes(
  serviceTypeId: string,
  planId: string,
): Promise<PcoPlanTime[]> {
  if (!isPcoConfigured()) return [];
  const rows = await pcoListAll<PlanTimeAttrs>(
    "services",
    `/service_types/${serviceTypeId}/plans/${planId}/plan_times`,
    { perPage: 100, maxPages: 2 },
  );
  return rows.map((r) => ({
    id: r.id,
    planId,
    startsAt: r.attributes.starts_at ?? "",
    endsAt: r.attributes.ends_at,
    timeType: r.attributes.time_type,
  }));
}

/** Who is scheduled on a plan (confirmed / unconfirmed / declined). */
export async function listPlanTeamMembers(
  serviceTypeId: string,
  planId: string,
  teamId?: string,
): Promise<PcoPlanAssignment[]> {
  if (!isPcoConfigured()) return [];
  const res = await pcoRequest<PcoListResponse<PlanPersonAttrs>>(
    "services",
    `/service_types/${serviceTypeId}/plans/${planId}/team_members${qs({
      include: "person,team",
      per_page: 100,
      ...(teamId ? { "where[team_id]": teamId } : {}),
    })}`,
  );

  return (res.data ?? []).map((row) => {
    const personRel = row.relationships?.person?.data;
    const teamRel = row.relationships?.team?.data;
    const personId = !Array.isArray(personRel) && personRel ? personRel.id : "";
    const team = !Array.isArray(teamRel) && teamRel ? teamRel.id : "";
    return {
      id: row.id,
      personId,
      planId,
      teamId: team,
      status: row.attributes.status ?? "U",
      teamPositionName: row.attributes.team_position_name,
      name: row.attributes.name,
    };
  });
}

export async function listNeededPositions(
  serviceTypeId: string,
  planId: string,
): Promise<PcoNeededPosition[]> {
  if (!isPcoConfigured()) return [];
  const rows = await pcoListAll<NeededAttrs>(
    "services",
    `/service_types/${serviceTypeId}/plans/${planId}/needed_positions`,
    { perPage: 100, maxPages: 3 },
  );

  return rows.map((r) => {
    const teamRel = r.relationships?.team?.data;
    const teamId = !Array.isArray(teamRel) && teamRel ? teamRel.id : "";
    return {
      id: r.id,
      planId,
      teamId,
      quantity: r.attributes.quantity ?? 0,
      teamPositionName: r.attributes.team_position_name ?? "Position",
    };
  });
}

/**
 * Schedule a person onto a Sunday plan / team (creates PlanPerson).
 * This is “put them on this Sunday’s hospitality team”.
 */
export async function schedulePersonOnPlan(input: {
  serviceTypeId: string;
  planId: string;
  personId: string;
  teamId: string;
  teamPositionName?: string;
  status?: "C" | "U" | "Confirmed" | "Unconfirmed";
  prepareNotification?: boolean;
  notes?: string;
}): Promise<{ id: string; mocked: boolean }> {
  if (!isPcoConfigured()) {
    return { id: `mock_plan_person_${input.personId}`, mocked: true };
  }

  const res = await pcoRequest<PcoSingleResponse<PlanPersonAttrs>>(
    "services",
    `/service_types/${input.serviceTypeId}/plans/${input.planId}/team_members`,
    {
      method: "POST",
      body: JSON.stringify({
        data: {
          type: "PlanPerson",
          attributes: {
            person_id: input.personId,
            team_id: input.teamId,
            status: input.status ?? "U",
            team_position_name: input.teamPositionName,
            prepare_notification: input.prepareNotification ?? true,
            notes: input.notes,
          },
        },
      }),
    },
  );

  return { id: res.data.id, mocked: false };
}

export function pcoPlanUrl(serviceTypeId: string, planId: string) {
  return `https://services.planningcenteronline.com/service_types/${serviceTypeId}/plans/${planId}`;
}
