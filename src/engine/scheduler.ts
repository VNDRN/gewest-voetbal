import type { Match } from "../types";

export function scheduleMatches(matches: Match[], fieldCount: number): Match[] {
  if (matches.length === 0) return [];

  const pool = matches.map((m) => ({ ...m }));
  const scheduled: Match[] = [];
  const remaining = new Set(pool.map((_, i) => i));

  const teamLastSlot = new Map<string, number>();

  let timeSlot = 0;

  while (remaining.size > 0) {
    const slotTeams = new Set<string>();
    let fieldsUsed = 0;

    for (let field = 0; field < fieldCount && remaining.size > 0; field++) {
      let bestIdx = -1;
      let bestScore = -Infinity;

      for (const idx of remaining) {
        const m = pool[idx];
        if (slotTeams.has(m.homeTeamId) || slotTeams.has(m.awayTeamId)) continue;

        const homeLastSlot = teamLastSlot.get(m.homeTeamId) ?? -Infinity;
        const awayLastSlot = teamLastSlot.get(m.awayTeamId) ?? -Infinity;
        const minGap = Math.min(
          timeSlot - homeLastSlot,
          timeSlot - awayLastSlot
        );

        if (minGap > bestScore) {
          bestScore = minGap;
          bestIdx = idx;
        }
      }

      if (bestIdx === -1) break;

      const m = pool[bestIdx];
      m.fieldIndex = field;
      m.timeSlot = timeSlot;
      slotTeams.add(m.homeTeamId);
      slotTeams.add(m.awayTeamId);
      teamLastSlot.set(m.homeTeamId, timeSlot);
      teamLastSlot.set(m.awayTeamId, timeSlot);
      scheduled.push(m);
      remaining.delete(bestIdx);
      fieldsUsed++;
    }

    if (fieldsUsed === 0) {
      timeSlot++;
      continue;
    }

    timeSlot++;
  }

  return scheduled;
}
