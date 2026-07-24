"use server";

import {
  addMemberToTeam,
  assignVolunteerToSunday,
  getSundayBoard,
  listAssignablePeople,
  listOpenVolunteerNeeds,
  listUpcomingSundays,
} from "@/lib/pco/workflows";
import {
  listTeamLeaders,
  listTeamRoster,
  listTeams,
  listTeamPositions,
  listTeamsLedByPerson,
} from "@/lib/pco/services";

/** Server actions for team-leader UI. */

export async function getUpcomingSundaysAction(limit = 4) {
  return listUpcomingSundays(limit);
}

export async function getOpenNeedsAction(sundays = 2) {
  return listOpenVolunteerNeeds(sundays);
}

export async function getSundayBoardAction(planId: string) {
  return getSundayBoard(planId);
}

export async function searchAssignablePeopleAction(query?: string) {
  return listAssignablePeople(query);
}

export async function listTeamsAction(serviceTypeId?: string) {
  return listTeams(serviceTypeId);
}

export async function listPositionsAction(serviceTypeId: string, teamId: string) {
  return listTeamPositions(serviceTypeId, teamId);
}

export async function listTeamRosterAction(teamId: string) {
  return listTeamRoster(teamId);
}

export async function listTeamLeadersAction(teamId: string) {
  return listTeamLeaders(teamId);
}

export async function listTeamsLedByPersonAction(personId: string) {
  return listTeamsLedByPerson(personId);
}

export async function addMemberToTeamAction(input: {
  personId: string;
  teamId: string;
  teamPositionId: string;
  serviceTypeId?: string;
  schedulePreference?: string;
}) {
  return addMemberToTeam(input);
}

export async function assignVolunteerToSundayAction(input: {
  personId: string;
  planId: string;
  teamId: string;
  teamPositionName?: string;
  notify?: boolean;
  notes?: string;
}) {
  return assignVolunteerToSunday(input);
}
