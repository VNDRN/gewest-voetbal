import type { Competition, DraftGroup } from "../types";
import { getGroupOptions } from "./groups";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createDraft(competition: Competition): DraftGroup[] {
  const opts = getGroupOptions(competition.teams.length);
  if (opts.length === 0) return [];

  const opt =
    opts.find((o) => o.sizes[0] === competition.config.groupSize) ?? opts[0];
  const shuffled = shuffle(competition.teams);
  const groups: DraftGroup[] = [];
  let teamIdx = 0;

  for (let g = 0; g < opt.groupCount; g++) {
    const groupSize = opt.sizes[g];
    const groupTeams = shuffled.slice(teamIdx, teamIdx + groupSize);
    teamIdx += groupSize;

    groups.push({
      id: `${competition.id}-group-${String.fromCharCode(65 + g)}`,
      name: `Groep ${String.fromCharCode(65 + g)}`,
      teamIds: groupTeams.map((t) => t.id),
    });
  }

  return groups;
}

export function moveDraftTeam(
  groups: DraftGroup[],
  teamId: string,
  targetGroupId: string
): DraftGroup[] {
  const sourceGroup = groups.find((g) => g.teamIds.includes(teamId));
  if (!sourceGroup || sourceGroup.id === targetGroupId) return groups;
  if (!groups.some((g) => g.id === targetGroupId)) return groups;

  return groups.map((g) => {
    if (g.id === sourceGroup.id) {
      return { ...g, teamIds: g.teamIds.filter((id) => id !== teamId) };
    }
    if (g.id === targetGroupId) {
      return { ...g, teamIds: [...g.teamIds, teamId] };
    }
    return g;
  });
}

export function validateDraft(groups: DraftGroup[]): string[] {
  const errors: string[] = [];
  for (const g of groups) {
    if (g.teamIds.length < 3) {
      errors.push(`${g.name} heeft slechts ${g.teamIds.length} teams (min. 3)`);
    } else if (g.teamIds.length > 5) {
      errors.push(`${g.name} heeft ${g.teamIds.length} teams (max. 5)`);
    }
  }
  return errors;
}
