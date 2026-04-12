import type { Match, StandingRow } from "../types";

function emptyRow(teamId: string): StandingRow {
  return {
    teamId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  };
}

function getHeadToHeadResult(
  a: string,
  b: string,
  matches: Match[]
): -1 | 0 | 1 {
  for (const m of matches) {
    if (!m.score) continue;
    if (m.homeTeamId === a && m.awayTeamId === b) {
      if (m.score.home > m.score.away) return 1;
      if (m.score.home < m.score.away) return -1;
      return 0;
    }
    if (m.homeTeamId === b && m.awayTeamId === a) {
      if (m.score.away > m.score.home) return 1;
      if (m.score.away < m.score.home) return -1;
      return 0;
    }
  }
  return 0;
}

export function calculateStandings(
  teamIds: string[],
  matches: Match[]
): StandingRow[] {
  const teamSet = new Set(teamIds);
  const rowMap = new Map<string, StandingRow>();
  for (const id of teamIds) rowMap.set(id, emptyRow(id));

  for (const m of matches) {
    if (!m.score) continue;
    if (!teamSet.has(m.homeTeamId) || !teamSet.has(m.awayTeamId)) continue;

    const home = rowMap.get(m.homeTeamId)!;
    const away = rowMap.get(m.awayTeamId)!;
    const { home: hg, away: ag } = m.score;

    home.played++;
    away.played++;
    home.goalsFor += hg;
    home.goalsAgainst += ag;
    away.goalsFor += ag;
    away.goalsAgainst += hg;

    if (hg > ag) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (hg < ag) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += 1;
      away.points += 1;
    }
  }

  for (const row of rowMap.values()) {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
  }

  const rows = [...rowMap.values()];
  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference)
      return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    const h2h = getHeadToHeadResult(a.teamId, b.teamId, matches);
    if (h2h !== 0) return -h2h;
    return 0;
  });

  return rows;
}

export function rankBestNextPlaced(rows: StandingRow[]): StandingRow[] {
  return [...rows].sort((a, b) => {
    const ap = a.played || 1;
    const bp = b.played || 1;

    const ppmDiff = b.points * ap - a.points * bp;
    if (ppmDiff !== 0) return ppmDiff;

    const gdpmDiff = b.goalDifference * ap - a.goalDifference * bp;
    if (gdpmDiff !== 0) return gdpmDiff;

    const gfpmDiff = b.goalsFor * ap - a.goalsFor * bp;
    if (gfpmDiff !== 0) return gfpmDiff;

    return 0;
  });
}
