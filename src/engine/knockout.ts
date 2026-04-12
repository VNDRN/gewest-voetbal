import type { KnockoutMatch, KnockoutRound } from "../types";

const ROUND_NAMES: Record<number, string> = {
  32: "32ste finales",
  16: "Achtste finales",
  8: "Kwartfinale",
  4: "Halve finale",
  2: "Finale",
};

function deepCloneRounds(rounds: KnockoutRound[]): KnockoutRound[] {
  return rounds.map((r) => ({
    ...r,
    matches: r.matches.map((m) => ({ ...m, score: m.score ? { ...m.score } : null })),
  }));
}

export function generateKnockoutRounds(bracketSize: number): KnockoutRound[] {
  const rounds: KnockoutRound[] = [];
  let matchCounter = 1;
  let currentSize = bracketSize;

  while (currentSize >= 2) {
    const matchCount = currentSize / 2;
    const roundName = ROUND_NAMES[currentSize] ?? `Ronde van ${currentSize}`;
    const matches: KnockoutMatch[] = [];

    for (let i = 0; i < matchCount; i++) {
      const isFirstRound = currentSize === bracketSize;
      const matchId = `ko-${matchCounter++}`;

      matches.push({
        id: matchId,
        homeTeamId: null,
        awayTeamId: null,
        fieldIndex: -1,
        timeSlot: -1,
        score: null,
        phase: "knockout",
        homeSourceDescription: isFirstRound ? `Positie ${i * 2 + 1}` : "",
        awaySourceDescription: isFirstRound ? `Positie ${i * 2 + 2}` : "",
      });
    }

    rounds.push({ name: roundName, matches });
    currentSize /= 2;
  }

  // Wire up source descriptions for rounds after the first
  for (let r = 1; r < rounds.length; r++) {
    const prevMatches = rounds[r - 1].matches;
    for (let i = 0; i < rounds[r].matches.length; i++) {
      rounds[r].matches[i].homeSourceDescription =
        `Winnaar ${prevMatches[i * 2].id}`;
      rounds[r].matches[i].awaySourceDescription =
        `Winnaar ${prevMatches[i * 2 + 1].id}`;
    }
  }

  return rounds;
}

export function seedBracket(
  rounds: KnockoutRound[],
  teams: { teamId: string; groupId: string }[]
): KnockoutRound[] {
  const result = deepCloneRounds(rounds);
  if (teams.length === 0) return result;

  const firstRound = result[0];
  // Build pairs that avoid same-group matchups
  const paired = buildPairs(teams, firstRound.matches.length);

  for (let i = 0; i < paired.length && i < firstRound.matches.length; i++) {
    firstRound.matches[i].homeTeamId = paired[i][0]?.teamId ?? null;
    firstRound.matches[i].awayTeamId = paired[i][1]?.teamId ?? null;
  }

  // Handle any leftover teams that didn't fit into pairs
  const placedIds = new Set(
    paired.flatMap((p) => p.filter(Boolean).map((t) => t!.teamId))
  );
  const unplaced = teams.filter((t) => !placedIds.has(t.teamId));

  for (const team of unplaced) {
    for (let i = 0; i < firstRound.matches.length; i++) {
      if (firstRound.matches[i].homeTeamId === null) {
        firstRound.matches[i].homeTeamId = team.teamId;
        break;
      }
      if (firstRound.matches[i].awayTeamId === null) {
        firstRound.matches[i].awayTeamId = team.teamId;
        break;
      }
    }
  }

  return result;
}

type TeamEntry = { teamId: string; groupId: string };

function buildPairs(
  teams: TeamEntry[],
  matchCount: number
): (TeamEntry | null)[][] {
  // Sort teams by group, interleaving groups to maximize avoidance
  const byGroup = new Map<string, TeamEntry[]>();
  for (const t of teams) {
    if (!byGroup.has(t.groupId)) byGroup.set(t.groupId, []);
    byGroup.get(t.groupId)!.push(t);
  }

  // Sort groups by size descending (largest group first)
  const groups = [...byGroup.entries()].sort((a, b) => b[1].length - a[1].length);

  // Interleave: round-robin pick from each group
  const interleaved: TeamEntry[] = [];
  let idx = 0;
  let placed = true;
  while (placed) {
    placed = false;
    for (const [, members] of groups) {
      if (idx < members.length) {
        interleaved.push(members[idx]);
        placed = true;
      }
    }
    idx++;
  }

  // Greedy pair from interleaved list
  const remaining = [...interleaved];
  const pairs: (TeamEntry | null)[][] = [];

  while (remaining.length >= 2 && pairs.length < matchCount) {
    const first = remaining.shift()!;
    let bestIdx = -1;

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].groupId !== first.groupId) {
        bestIdx = i;
        break;
      }
    }

    if (bestIdx === -1) bestIdx = 0;

    const second = remaining.splice(bestIdx, 1)[0];
    pairs.push([first, second]);
  }

  if (remaining.length === 1 && pairs.length < matchCount) {
    pairs.push([remaining[0], null]);
  }

  while (pairs.length < matchCount) {
    pairs.push([null, null]);
  }

  return pairs;
}

export function advanceWinner(
  rounds: KnockoutRound[],
  matchId: string
): KnockoutRound[] {
  const result = deepCloneRounds(rounds);

  // Find the match and its round index
  let roundIdx = -1;
  let matchIdx = -1;
  for (let r = 0; r < result.length; r++) {
    for (let m = 0; m < result[r].matches.length; m++) {
      if (result[r].matches[m].id === matchId) {
        roundIdx = r;
        matchIdx = m;
        break;
      }
    }
    if (roundIdx !== -1) break;
  }

  if (roundIdx === -1) return result;

  const match = result[roundIdx].matches[matchIdx];
  if (!match.score) return result;

  // No next round to advance to
  if (roundIdx >= result.length - 1) return result;

  // Determine winner
  let winnerId: string | null;
  if (match.score.home > match.score.away) {
    winnerId = match.homeTeamId;
  } else if (match.score.away > match.score.home) {
    winnerId = match.awayTeamId;
  } else {
    // Draw — home team advances as tiebreak
    winnerId = match.homeTeamId;
  }

  // Place winner: even index → home slot, odd index → away slot
  const nextMatchIdx = Math.floor(matchIdx / 2);
  if (matchIdx % 2 === 0) {
    result[roundIdx + 1].matches[nextMatchIdx].homeTeamId = winnerId;
  } else {
    result[roundIdx + 1].matches[nextMatchIdx].awayTeamId = winnerId;
  }

  return result;
}
