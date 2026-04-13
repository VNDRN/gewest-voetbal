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
