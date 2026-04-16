import type { ScheduledMatch } from "../types";

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
  competitionId: string,
  rounds: KnockoutRoundInfo[]
): { competitionId: string; tier: number; isThirdPlace: boolean } | null {
  for (let ri = 0; ri < rounds.length; ri++) {
    const r = rounds[ri];
    if (r.competitionId !== competitionId) continue;
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
    const t = tierOf(match.id, match.competitionId, rounds);
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
  competitionId?: string;
};

export type SwapChange = {
  kind: "swap";
  matchAId: string;
  matchACompetitionId: string;
  matchBId: string;
  matchBCompetitionId: string;
};

export type Change = MoveChange | SwapChange;

export type ValidationReason =
  | "played"
  | "team-conflict"
  | "round-order"
  | "phase-order"
  | "field-conflict"
  | "structural";

export type ValidationResult =
  | { ok: true; next: ScheduledMatch[] }
  | { ok: false; reason: ValidationReason };

type MatchRef = { id: string; competitionId?: string };

function movedMatchRefs(change: Change): MatchRef[] {
  if (change.kind === "swap") {
    return [
      { id: change.matchAId, competitionId: change.matchACompetitionId },
      { id: change.matchBId, competitionId: change.matchBCompetitionId },
    ];
  }
  return [{ id: change.matchId, competitionId: change.competitionId }];
}

function anyPlayed(matches: ScheduledMatch[], refs: MatchRef[]): boolean {
  return refs.some(
    (ref) =>
      matches.find(
        (m) =>
          m.id === ref.id &&
          (ref.competitionId == null || m.competitionId === ref.competitionId)
      )?.score != null
  );
}

function hasFieldConflict(matches: ScheduledMatch[]): boolean {
  const seen = new Set<string>();
  for (const m of matches) {
    const key = `${m.timeSlot}-${m.fieldIndex}`;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
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

function hasPhaseOrderViolation(matches: ScheduledMatch[]): boolean {
  const competitions = [...new Set(matches.map((m) => m.competitionId))];
  for (const compId of competitions) {
    const comp = matches.filter((m) => m.competitionId === compId);
    const groupMax = comp
      .filter((m) => m.phase === "group")
      .reduce((max, m) => Math.max(max, m.timeSlot), -1);
    const koMin = comp
      .filter((m) => m.phase === "knockout")
      .reduce((min, m) => Math.min(min, m.timeSlot), Infinity);
    if (groupMax >= koMin) return true;
  }
  return false;
}

export function validateChange(
  matches: ScheduledMatch[],
  change: Change,
  context: ValidationContext = { rounds: [] }
): ValidationResult {
  if (anyPlayed(matches, movedMatchRefs(change))) {
    return { ok: false, reason: "played" };
  }
  const next = applyChange(matches, change);
  if (hasFieldConflict(next)) {
    return { ok: false, reason: "field-conflict" };
  }
  if (hasTeamConflict(next)) {
    return { ok: false, reason: "team-conflict" };
  }
  if (hasRoundOrderViolation(next, context.rounds)) {
    return { ok: false, reason: "round-order" };
  }
  if (hasPhaseOrderViolation(next)) {
    return { ok: false, reason: "phase-order" };
  }
  return { ok: true, next };
}

export type TargetClass = "valid-move" | "valid-swap" | "invalid";

export function classifyTargets(
  matches: ScheduledMatch[],
  activeMatchId: string,
  fieldCount: number,
  context: ValidationContext = { rounds: [] },
  activeCompetitionId?: string
): Map<string, TargetClass> {
  const map = new Map<string, TargetClass>();

  const active = matches.find(
    (m) => m.id === activeMatchId && (activeCompetitionId == null || m.competitionId === activeCompetitionId)
  );
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
          { kind: "move", matchId: activeMatchId, toSlot: slot, toField: field, competitionId: active.competitionId },
          context
        );
        map.set(id, res.ok ? "valid-move" : "invalid");
        continue;
      }
      if (occupant.id === activeMatchId && occupant.competitionId === active.competitionId) {
        map.set(id, "valid-move");
        continue;
      }
      const res = validateChange(
        matches,
        {
          kind: "swap",
          matchAId: activeMatchId,
          matchACompetitionId: active.competitionId,
          matchBId: occupant.id,
          matchBCompetitionId: occupant.competitionId,
        },
        context
      );
      map.set(id, res.ok ? "valid-swap" : "invalid");
    }
  }

  return map;
}

export function changeFromDragEnd(
  activeMatchId: string,
  overId: string,
  matches: ScheduledMatch[],
  activeCompetitionId?: string
): Change | null {
  if (overId.startsWith("cell-")) {
    const parts = overId.split("-");
    if (parts.length !== 3) return null;
    const slot = Number(parts[1]);
    const field = Number(parts[2]);
    if (!Number.isFinite(slot) || !Number.isFinite(field)) return null;
    const active = matches.find(
      (m) => m.id === activeMatchId && (activeCompetitionId == null || m.competitionId === activeCompetitionId)
    );
    if (!active) return null;
    if (active.timeSlot === slot && active.fieldIndex === field) {
      return null;
    }
    const occupant = matches.find(
      (m) => m.timeSlot === slot && m.fieldIndex === field
    );
    if (!occupant) {
      return { kind: "move", matchId: activeMatchId, toSlot: slot, toField: field, competitionId: activeCompetitionId };
    }
    return {
      kind: "swap",
      matchAId: activeMatchId,
      matchACompetitionId: active.competitionId,
      matchBId: occupant.id,
      matchBCompetitionId: occupant.competitionId,
    };
  }
  return null;
}

function matchesId(m: ScheduledMatch, id: string, competitionId?: string): boolean {
  return m.id === id && (competitionId == null || m.competitionId === competitionId);
}

export function applyChange(
  matches: ScheduledMatch[],
  change: Change
): ScheduledMatch[] {
  switch (change.kind) {
    case "move":
      return matches.map((m) =>
        matchesId(m, change.matchId, change.competitionId)
          ? { ...m, timeSlot: change.toSlot, fieldIndex: change.toField }
          : m
      );
    case "swap": {
      const a = matches.find((m) => matchesId(m, change.matchAId, change.matchACompetitionId));
      const b = matches.find((m) => matchesId(m, change.matchBId, change.matchBCompetitionId));
      if (!a || !b) return matches;
      return matches.map((m) => {
        if (m === a) return { ...m, timeSlot: b.timeSlot, fieldIndex: b.fieldIndex };
        if (m === b) return { ...m, timeSlot: a.timeSlot, fieldIndex: a.fieldIndex };
        return m;
      });
    }
  }
}
