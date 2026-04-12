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

export function bracketSeeds(size: number): number[] {
  if (size <= 1) return [1];
  const half = bracketSeeds(size / 2);
  const result: number[] = [];
  for (const seed of half) {
    result.push(seed, size + 1 - seed);
  }
  return result;
}

export function generateKnockoutRounds(bracketSize: number): KnockoutRound[] {
  const rounds: KnockoutRound[] = [];
  let matchCounter = 1;
  let currentSize = bracketSize;
  const seeds = bracketSeeds(bracketSize);

  while (currentSize >= 2) {
    // Insert kleine finale before the final so IDs stay sequential
    if (currentSize === 2 && bracketSize >= 4) {
      const semiRound = rounds[rounds.length - 1];
      rounds.push({
        name: "Kleine finale",
        matches: [{
          id: `ko-${matchCounter++}`,
          homeTeamId: null,
          awayTeamId: null,
          fieldIndex: -1,
          timeSlot: -1,
          score: null,
          phase: "knockout",
          homeSourceDescription: `Verliezer ${semiRound.matches[0].id}`,
          awaySourceDescription: `Verliezer ${semiRound.matches[1].id}`,
        }],
        isThirdPlace: true,
      });
    }

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
        homeSourceDescription: isFirstRound ? `Positie ${seeds[i * 2]}` : "",
        awaySourceDescription: isFirstRound ? `Positie ${seeds[i * 2 + 1]}` : "",
      });
    }

    rounds.push({ name: roundName, matches });
    currentSize /= 2;
  }

  // Wire up source descriptions for rounds after the first
  for (let r = 1; r < rounds.length; r++) {
    if (rounds[r].isThirdPlace) continue;

    // Skip over the kleine finale to find the feeding round
    let prevR = r - 1;
    if (rounds[prevR].isThirdPlace) prevR--;

    const prevMatches = rounds[prevR].matches;
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
  const matchCount = firstRound.matches.length;
  const bSize = matchCount * 2;

  const seedMap = new Map<number, { teamId: string; groupId: string }>();
  for (let i = 0; i < teams.length && i < bSize; i++) {
    seedMap.set(i + 1, teams[i]);
  }

  const seedOrder = bracketSeeds(bSize);
  const matchSlots: [number, number][] = [];
  for (let i = 0; i < matchCount; i++) {
    matchSlots.push([seedOrder[i * 2], seedOrder[i * 2 + 1]]);
  }

  // Resolve same-group conflicts by swapping
  for (let m = 0; m < matchCount; m++) {
    const [homeSeed, awaySeed] = matchSlots[m];
    const home = seedMap.get(homeSeed);
    const away = seedMap.get(awaySeed);
    if (!home || !away || home.groupId !== away.groupId) continue;

    let swapped = false;
    for (let other = 0; other < matchCount && !swapped; other++) {
      if (other === m) continue;
      const [ohSeed, oaSeed] = matchSlots[other];
      const oh = seedMap.get(ohSeed);
      const oa = seedMap.get(oaSeed);
      if (!oa) continue;
      if (oa.groupId !== home.groupId && (!oh || away.groupId !== oh.groupId)) {
        seedMap.set(awaySeed, oa);
        seedMap.set(oaSeed, away);
        swapped = true;
      }
    }

    if (!swapped) {
      for (let other = 0; other < matchCount && !swapped; other++) {
        if (other === m) continue;
        const [ohSeed, oaSeed] = matchSlots[other];
        const oh = seedMap.get(ohSeed);
        const oa = seedMap.get(oaSeed);
        if (!oh) continue;
        if (oh.groupId !== away.groupId && (!oa || home.groupId !== oa.groupId)) {
          seedMap.set(homeSeed, oh);
          seedMap.set(ohSeed, home);
          swapped = true;
        }
      }
    }
  }

  for (let m = 0; m < matchCount; m++) {
    const [homeSeed, awaySeed] = matchSlots[m];
    firstRound.matches[m].homeTeamId = seedMap.get(homeSeed)?.teamId ?? null;
    firstRound.matches[m].awayTeamId = seedMap.get(awaySeed)?.teamId ?? null;
  }

  return result;
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

  // No advancement from final or third-place match
  if (roundIdx >= result.length - 1) return result;
  if (result[roundIdx].isThirdPlace) return result;

  // Determine winner & loser
  let winnerId: string | null;
  let loserId: string | null;
  if (match.score.home > match.score.away) {
    winnerId = match.homeTeamId;
    loserId = match.awayTeamId;
  } else if (match.score.away > match.score.home) {
    winnerId = match.awayTeamId;
    loserId = match.homeTeamId;
  } else {
    // Draw — home team advances as tiebreak
    winnerId = match.homeTeamId;
    loserId = match.awayTeamId;
  }

  const nextMatchIdx = Math.floor(matchIdx / 2);
  const isHome = matchIdx % 2 === 0;

  // Semi-final: loser → kleine finale, winner → final (skip KF round)
  if (result[roundIdx + 1]?.isThirdPlace) {
    if (isHome) {
      result[roundIdx + 1].matches[nextMatchIdx].homeTeamId = loserId;
    } else {
      result[roundIdx + 1].matches[nextMatchIdx].awayTeamId = loserId;
    }
    if (roundIdx + 2 < result.length) {
      if (isHome) {
        result[roundIdx + 2].matches[nextMatchIdx].homeTeamId = winnerId;
      } else {
        result[roundIdx + 2].matches[nextMatchIdx].awayTeamId = winnerId;
      }
    }
    return result;
  }

  // Normal advancement: winner → next round
  if (isHome) {
    result[roundIdx + 1].matches[nextMatchIdx].homeTeamId = winnerId;
  } else {
    result[roundIdx + 1].matches[nextMatchIdx].awayTeamId = winnerId;
  }

  return result;
}
