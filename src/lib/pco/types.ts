/** Domain types for Planning Center People + Services (app-facing, not raw JSON:API). */

export type PcoPerson = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  status?: string;
  membership?: string;
  email?: string;
  phone?: string;
};

export type PcoServiceType = {
  id: string;
  name: string;
  frequency?: string;
};

export type PcoTeam = {
  id: string;
  name: string;
  serviceTypeId: string;
  archivedAt?: string | null;
};

export type PcoTeamPosition = {
  id: string;
  name: string;
  teamId: string;
  sequence?: number;
};

/** Standing roster assignment (person ↔ team position). */
export type PcoTeamRosterAssignment = {
  id: string;
  personId: string;
  teamPositionId: string;
  schedulePreference?: string;
  person?: PcoPerson;
  positionName?: string;
};

/** Leader of a specific Services team. */
export type PcoTeamLeader = {
  id: string;
  personId: string;
  teamId: string;
  person?: PcoPerson;
  team?: PcoTeam;
};

export type PcoPlan = {
  id: string;
  serviceTypeId: string;
  title: string | null;
  dates: string;
  shortDates: string;
  sortDate: string;
  planningCenterUrl?: string;
  neededPositionsCount?: number;
  planPeopleCount?: number;
};

export type PcoPlanTime = {
  id: string;
  planId: string;
  startsAt: string;
  endsAt?: string;
  timeType?: string; // Service / Rehearsal / Other
};

/** Someone scheduled onto a plan (Sunday volunteer slot). */
export type PcoPlanAssignment = {
  id: string;
  personId: string;
  planId: string;
  teamId: string;
  status: "C" | "U" | "D" | string; // Confirmed / Unconfirmed / Declined
  teamPositionName?: string;
  name?: string;
  person?: PcoPerson;
};

/** Unfilled need on a plan. */
export type PcoNeededPosition = {
  id: string;
  planId: string;
  teamId: string;
  quantity: number;
  teamPositionName: string;
};

/** Aggregated Sunday view for team leaders. */
export type SundayBoard = {
  plan: PcoPlan;
  times: PcoPlanTime[];
  teams: Array<{
    team: PcoTeam;
    positions: PcoTeamPosition[];
    scheduled: PcoPlanAssignment[];
    needed: PcoNeededPosition[];
    openSlots: number;
  }>;
};
