import type { ScheduledMatch } from "../components/ScheduleGrid";
import type { ScheduleBreak } from "../types";

export type KnockoutRoundInfo = {
  competitionId: string;
  name: string;
  matchIds: string[];
  isThirdPlace: boolean;
};

export type ValidationContext = {
  rounds: KnockoutRoundInfo[];
};

function tierOf(
  matchId: string,
  rounds: KnockoutRoundInfo[]
): { competitionId: string; tier: number; isThirdPlace: boolean } | null {
  for (let ri = 0; ri < rounds.length; ri++) {
    const r = rounds[ri];
    if (!r.matchIds.includes(matchId)) continue;
    if (r.isThirdPlace) {
      // sibling tier of the highest non-isThirdPlace round in the same competition
      let finalTier = -1;
      let tierCounter = 0;
      for (const rr of rounds) {
        if (rr.competitionId !== r.competitionId) continue;
        if (rr.isThirdPlace) continue;
        finalTier = tierCounter;
        tierCounter++;
      }
      return { competitionId: r.competitionId, tier: finalTier, isThirdPlace: true };
    }
    let tierCounter = 0;
    for (let j = 0; j < ri; j++) {
      if (rounds[j].competitionId !== r.competitionId) continue;
      if (rounds[j].isThirdPlace) continue;
      tierCounter++;
    }
    return { competitionId: r.competitionId, tier: tierCounter, isThirdPlace: false };
  }
  return null;
}

function hasRoundOrderViolation(
  matches: ScheduledMatch[],
  rounds: KnockoutRoundInfo[]
): boolean {
  const tiered: {
    m: ScheduledMatch;
    competitionId: string;
    tier: number;
    isThirdPlace: boolean;
  }[] = [];
  for (const match of matches) {
    if (match.phase !== "knockout") continue;
    const t = tierOf(match.id, rounds);
    if (!t) continue;
    tiered.push({ m: match, ...t });
  }
  for (const a of tiered) {
    for (const b of tiered) {
      if (a.competitionId !== b.competitionId) continue;
      // earlier tier must have strictly earlier slot
      if (a.tier < b.tier && a.m.timeSlot >= b.m.timeSlot) return true;
      // third-place is a sibling of the final — cannot go AFTER it
      if (
        a.tier === b.tier &&
        a.isThirdPlace &&
        !b.isThirdPlace &&
        a.m.timeSlot > b.m.timeSlot
      )
        return true;
    }
  }
  return false;
}

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
  change: Change,
  context: ValidationContext = { rounds: [] }
): ValidationResult {
  if (anyPlayed(matches, movedMatchIds(change))) {
    return { ok: false, reason: "played" };
  }
  const next = applyChange(matches, change);
  if (hasTeamConflict(next)) {
    return { ok: false, reason: "team-conflict" };
  }
  if (hasRoundOrderViolation(next, context.rounds)) {
    return { ok: false, reason: "round-order" };
  }
  return { ok: true, next };
}

export type TargetClass = "valid-move" | "valid-swap" | "valid-insert" | "invalid";

export function classifyTargets(
  matches: ScheduledMatch[],
  activeMatchId: string,
  fieldCount: number,
  breaks: ScheduleBreak[],
  context: ValidationContext = { rounds: [] }
): Map<string, TargetClass> {
  const map = new Map<string, TargetClass>();

  const active = matches.find((m) => m.id === activeMatchId);
  if (!active) return map;

  const maxSlot = matches.reduce((max, m) => Math.max(max, m.timeSlot), 0);

  // Cell targets
  for (let slot = 0; slot <= maxSlot; slot++) {
    for (let field = 0; field < fieldCount; field++) {
      const id = `cell-${slot}-${field}`;
      const occupant = matches.find(
        (m) => m.timeSlot === slot && m.fieldIndex === field
      );
      if (!occupant) {
        const res = validateChange(
          matches,
          { kind: "move", matchId: activeMatchId, toSlot: slot, toField: field },
          context
        );
        map.set(id, res.ok ? "valid-move" : "invalid");
        continue;
      }
      if (occupant.id === activeMatchId) {
        map.set(id, "valid-move");
        continue;
      }
      const res = validateChange(
        matches,
        { kind: "swap", matchAId: activeMatchId, matchBId: occupant.id },
        context
      );
      map.set(id, res.ok ? "valid-swap" : "invalid");
    }
  }

  // Insert-row targets: between rows + around breaks
  const insertPositions = new Set<number>();
  for (let slot = 0; slot <= maxSlot + 1; slot++) {
    insertPositions.add(slot);
  }
  for (const b of breaks) {
    insertPositions.add(b.afterTimeSlot + 1);
  }
  for (const atSlot of insertPositions) {
    for (let field = 0; field < fieldCount; field++) {
      const id = `insert-${atSlot}-${field}`;
      const res = validateChange(
        matches,
        { kind: "insert", matchId: activeMatchId, atSlot, toField: field },
        context
      );
      map.set(id, res.ok ? "valid-insert" : "invalid");
    }
  }

  return map;
}

export function changeFromDragEnd(
  activeMatchId: string,
  overId: string,
  matches: ScheduledMatch[]
): Change | null {
  if (overId.startsWith("cell-")) {
    const parts = overId.split("-");
    if (parts.length !== 3) return null;
    const slot = Number(parts[1]);
    const field = Number(parts[2]);
    if (!Number.isFinite(slot) || !Number.isFinite(field)) return null;
    const active = matches.find((m) => m.id === activeMatchId);
    if (active && active.timeSlot === slot && active.fieldIndex === field) {
      return null;
    }
    const occupant = matches.find(
      (m) => m.timeSlot === slot && m.fieldIndex === field
    );
    if (!occupant) {
      return { kind: "move", matchId: activeMatchId, toSlot: slot, toField: field };
    }
    return { kind: "swap", matchAId: activeMatchId, matchBId: occupant.id };
  }
  if (overId.startsWith("insert-")) {
    const parts = overId.split("-");
    if (parts.length !== 3) return null;
    const atSlot = Number(parts[1]);
    const field = Number(parts[2]);
    if (!Number.isFinite(atSlot) || !Number.isFinite(field)) return null;
    return { kind: "insert", matchId: activeMatchId, atSlot, toField: field };
  }
  return null;
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
