import { describe, it, expect } from "vitest";
import { applyChange, validateChange } from "../../engine/scheduleMove";
import type { ScheduledMatch } from "../../components/ScheduleGrid";

function m(partial: Partial<ScheduledMatch> = {}): ScheduledMatch {
  return {
    id: "m1",
    homeTeamId: "a",
    awayTeamId: "b",
    fieldIndex: 0,
    timeSlot: 0,
    score: null,
    phase: "group",
    competitionId: "mens",
    groupName: "Groep A",
    ...partial,
  };
}

describe("applyChange — move", () => {
  it("moves a match to a new (slot, field) and leaves the rest alone", () => {
    const matches = [
      m({ id: "x", timeSlot: 0, fieldIndex: 0 }),
      m({ id: "y", timeSlot: 1, fieldIndex: 1, homeTeamId: "c", awayTeamId: "d" }),
    ];
    const next = applyChange(matches, {
      kind: "move",
      matchId: "x",
      toSlot: 2,
      toField: 2,
    });
    const moved = next.find((n) => n.id === "x")!;
    const untouched = next.find((n) => n.id === "y")!;
    expect(moved.timeSlot).toBe(2);
    expect(moved.fieldIndex).toBe(2);
    expect(untouched.timeSlot).toBe(1);
    expect(untouched.fieldIndex).toBe(1);
  });
});

describe("applyChange — swap", () => {
  it("exchanges the (slot, field) of two matches", () => {
    const matches = [
      m({ id: "a", timeSlot: 0, fieldIndex: 0 }),
      m({ id: "b", timeSlot: 3, fieldIndex: 2, homeTeamId: "c", awayTeamId: "d" }),
    ];
    const next = applyChange(matches, {
      kind: "swap",
      matchAId: "a",
      matchBId: "b",
    });
    const a = next.find((n) => n.id === "a")!;
    const b = next.find((n) => n.id === "b")!;
    expect(a.timeSlot).toBe(3);
    expect(a.fieldIndex).toBe(2);
    expect(b.timeSlot).toBe(0);
    expect(b.fieldIndex).toBe(0);
  });
});

describe("applyChange — insert", () => {
  it("shifts every match with timeSlot >= atSlot by +1 and places the moved match at (atSlot, toField)", () => {
    const matches = [
      m({ id: "a", timeSlot: 0, fieldIndex: 0 }),
      m({ id: "b", timeSlot: 1, fieldIndex: 1, homeTeamId: "c", awayTeamId: "d" }),
      m({ id: "c", timeSlot: 2, fieldIndex: 0, homeTeamId: "e", awayTeamId: "f" }),
    ];
    const next = applyChange(matches, {
      kind: "insert",
      matchId: "c",
      atSlot: 1,
      toField: 2,
    });
    const a = next.find((n) => n.id === "a")!;
    const b = next.find((n) => n.id === "b")!;
    const c = next.find((n) => n.id === "c")!;
    expect(a.timeSlot).toBe(0);
    expect(b.timeSlot).toBe(2); // shifted from 1 to 2
    expect(c.timeSlot).toBe(1); // placed at atSlot
    expect(c.fieldIndex).toBe(2);
  });

  it("does not shift the inserted match when its original slot is >= atSlot", () => {
    const matches = [
      m({ id: "a", timeSlot: 0, fieldIndex: 0 }),
      m({ id: "b", timeSlot: 3, fieldIndex: 0, homeTeamId: "c", awayTeamId: "d" }),
    ];
    const next = applyChange(matches, {
      kind: "insert",
      matchId: "b",
      atSlot: 1,
      toField: 1,
    });
    const b = next.find((n) => n.id === "b")!;
    expect(b.timeSlot).toBe(1);
    expect(b.fieldIndex).toBe(1);
  });
});

describe("validateChange — team conflict", () => {
  it("rejects a swap that would put the same team in the same slot twice", () => {
    // a: alpha vs beta in slot 0 field 0
    // b: gamma vs alpha in slot 1 field 0
    // c: gamma vs delta in slot 0 field 1
    // Swap a <-> b: (gamma vs alpha) lands in slot 0 alongside (gamma vs delta) — team `gamma` plays twice.
    const matches = [
      m({ id: "a", timeSlot: 0, fieldIndex: 0, homeTeamId: "alpha", awayTeamId: "beta" }),
      m({ id: "b", timeSlot: 1, fieldIndex: 0, homeTeamId: "gamma", awayTeamId: "alpha" }),
      m({ id: "c", timeSlot: 0, fieldIndex: 1, homeTeamId: "gamma", awayTeamId: "delta" }),
    ];
    const res = validateChange(matches, { kind: "swap", matchAId: "a", matchBId: "b" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("team-conflict");
  });

  it("accepts a move into an empty slot with no team conflict", () => {
    const matches = [m({ id: "a", timeSlot: 0, fieldIndex: 0 })];
    const res = validateChange(matches, {
      kind: "move",
      matchId: "a",
      toSlot: 3,
      toField: 0,
    });
    expect(res.ok).toBe(true);
  });

  it("ignores null teamIds (knockout TBD) when checking conflicts", () => {
    const matches = [
      m({
        id: "k1",
        phase: "knockout",
        timeSlot: 0,
        fieldIndex: 0,
        homeTeamId: null as unknown as string,
        awayTeamId: null as unknown as string,
      }),
      m({
        id: "k2",
        phase: "knockout",
        timeSlot: 0,
        fieldIndex: 1,
        homeTeamId: null as unknown as string,
        awayTeamId: null as unknown as string,
      }),
    ];
    const res = validateChange(matches, {
      kind: "swap",
      matchAId: "k1",
      matchBId: "k2",
    });
    expect(res.ok).toBe(true);
  });
});

describe("validateChange — unplayed guard", () => {
  it("rejects moving a match that already has a score", () => {
    const matches = [
      m({ id: "a", timeSlot: 0, fieldIndex: 0, score: { home: 1, away: 0 } }),
    ];
    const res = validateChange(matches, {
      kind: "move",
      matchId: "a",
      toSlot: 2,
      toField: 0,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("played");
  });
});
