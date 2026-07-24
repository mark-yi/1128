/**
 * Volunteer form area keys → Planning Center Services team ids.
 * Synced from Sunday Worship (service type 1567708).
 */

export type TeamDef = {
  key: string;
  label: string;
  /** PCO Services team id */
  pcoTeamId: string;
};

export const TEAMS: TeamDef[] = [
  { key: "coffee_cart", label: "Coffee cart", pcoTeamId: "7417905" },
  { key: "welcome", label: "Welcome team", pcoTeamId: "6351731" },
  { key: "praise", label: "Praise team", pcoTeamId: "6351730" },
  { key: "av", label: "Audio / visual", pcoTeamId: "6351729" },
  { key: "media", label: "Media", pcoTeamId: "7147837" },
  { key: "prayer", label: "Prayer", pcoTeamId: "7391995" },
  { key: "parking", label: "Parking", pcoTeamId: "6814914" },
  { key: "fellowship", label: "Fellowship", pcoTeamId: "7002688" },
];

export function getTeamByKey(key: string): TeamDef | undefined {
  return TEAMS.find((t) => t.key === key);
}

export function getTeamByPcoId(pcoTeamId: string): TeamDef | undefined {
  return TEAMS.find((t) => t.pcoTeamId && t.pcoTeamId === pcoTeamId);
}

export function volunteerAreaOptions() {
  return TEAMS.map((t) => ({ value: t.key, label: t.label }));
}

/** Resolve selected form area keys to team refs. */
export function resolveTeamIdsFromAreas(areas: string[]): Array<{
  teamKey: string;
  pcoTeamId: string;
  label: string;
}> {
  const out: Array<{ teamKey: string; pcoTeamId: string; label: string }> = [];
  for (const key of areas) {
    const team = getTeamByKey(key);
    if (!team) continue;
    out.push({
      teamKey: team.key,
      pcoTeamId: team.pcoTeamId,
      label: team.label,
    });
  }
  return out;
}
