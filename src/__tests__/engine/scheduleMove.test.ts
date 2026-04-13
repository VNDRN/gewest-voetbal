import { describe, it, expect } from "vitest";
import { applyChange } from "../../engine/scheduleMove";
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
