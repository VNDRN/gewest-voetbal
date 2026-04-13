import type { ScheduledMatch } from "../components/ScheduleGrid";

export type MoveChange = {
  kind: "move";
  matchId: string;
  toSlot: number;
  toField: number;
};

export type SwapChange = {
  kind: "swap";
  matchAId: string;
  matchBId: string;
};

export type InsertChange = {
  kind: "insert";
  matchId: string;
  atSlot: number;
  toField: number;
};

export type Change = MoveChange | SwapChange | InsertChange;

export type ValidationReason =
  | "played"
  | "team-conflict"
  | "round-order"
  | "structural";

export type ValidationResult =
  | { ok: true; next: ScheduledMatch[] }
  | { ok: false; reason: ValidationReason };

function movedMatchIds(change: Change): string[] {
  if (change.kind === "swap") return [change.matchAId, change.matchBId];
  return [change.matchId];
}

function anyPlayed(matches: ScheduledMatch[], ids: string[]): boolean {
  return ids.some(
    (id) => matches.find((m) => m.id === id)?.score != null
  );
}

function hasTeamConflict(matches: ScheduledMatch[]): boolean {
  const bySlot = new Map<number, Set<string>>();
  for (const m of matches) {
    let seen = bySlot.get(m.timeSlot);
    if (!seen) {
      seen = new Set();
      bySlot.set(m.timeSlot, seen);
    }
    for (const tid of [m.homeTeamId, m.awayTeamId]) {
      if (tid == null) continue;
      if (seen.has(tid)) return true;
      seen.add(tid);
    }
  }
  return false;
}

export function validateChange(
  matches: ScheduledMatch[],
  change: Change
): ValidationResult {
  if (anyPlayed(matches, movedMatchIds(change))) {
    return { ok: false, reason: "played" };
  }
  const next = applyChange(matches, change);
  if (hasTeamConflict(next)) {
    return { ok: false, reason: "team-conflict" };
  }
  return { ok: true, next };
}

export function applyChange(
  matches: ScheduledMatch[],
  change: Change
): ScheduledMatch[] {
  switch (change.kind) {
    case "move":
      return matches.map((m) =>
        m.id === change.matchId
          ? { ...m, timeSlot: change.toSlot, fieldIndex: change.toField }
          : m
      );
    case "swap": {
      const a = matches.find((m) => m.id === change.matchAId);
      const b = matches.find((m) => m.id === change.matchBId);
      if (!a || !b) return matches;
      return matches.map((m) => {
        if (m.id === a.id) return { ...m, timeSlot: b.timeSlot, fieldIndex: b.fieldIndex };
        if (m.id === b.id) return { ...m, timeSlot: a.timeSlot, fieldIndex: a.fieldIndex };
        return m;
      });
    }
    case "insert": {
      return matches.map((m) => {
        if (m.id === change.matchId) {
          return { ...m, timeSlot: change.atSlot, fieldIndex: change.toField };
        }
        if (m.timeSlot >= change.atSlot) {
          return { ...m, timeSlot: m.timeSlot + 1 };
        }
        return m;
      });
    }
  }
}
