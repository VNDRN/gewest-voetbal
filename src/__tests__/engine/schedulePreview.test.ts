import { describe, it, expect } from "vitest";
import { previewKindFor } from "../../engine/schedulePreview";
import type { TargetClass } from "../../engine/scheduleMove";
import type { ScheduledMatch } from "../../types";

function m(partial: Partial<ScheduledMatch> = {}): ScheduledMatch {
  return {
    id: "x",
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

describe("previewKindFor", () => {
  it("returns default when there's no active drag", () => {
    expect(previewKindFor("cell-0-0", null, null, new Map(), [])).toEqual({
      kind: "default",
    });
  });

  it("returns source-dimmed on the source cell when nothing is hovered", () => {
    const active = m({ timeSlot: 2, fieldIndex: 1 });
    expect(
      previewKindFor("cell-2-1", active, null, new Map(), [active])
    ).toEqual({ kind: "source-dimmed" });
  });

  it("returns target-self-ghost with hideOccupant=false on a hovered valid-move cell", () => {
    const active = m({ id: "a", timeSlot: 0, fieldIndex: 0 });
    const targetMap = new Map<string, TargetClass>([
      ["cell-3-2", "valid-move"],
    ]);
    expect(
      previewKindFor("cell-3-2", active, "cell-3-2", targetMap, [active])
    ).toEqual({ kind: "target-self-ghost", match: active, hideOccupant: false });
  });

  it("returns target-self-ghost with hideOccupant=true on a hovered valid-swap cell", () => {
    const active = m({ id: "a", timeSlot: 0, fieldIndex: 0 });
    const partner = m({
      id: "b",
      timeSlot: 3,
      fieldIndex: 2,
      homeTeamId: "c",
      awayTeamId: "d",
    });
    const targetMap = new Map<string, TargetClass>([
      ["cell-3-2", "valid-swap"],
    ]);
    const r = previewKindFor("cell-3-2", active, "cell-3-2", targetMap, [
      active,
      partner,
    ]);
    expect(r.kind).toBe("target-self-ghost");
    if (r.kind === "target-self-ghost") {
      expect(r.match).toBe(active);
      expect(r.hideOccupant).toBe(true);
    }
  });

  it("returns source-partner-ghost on the source cell when a swap is hovered", () => {
    const active = m({ id: "a", timeSlot: 0, fieldIndex: 0 });
    const partner = m({
      id: "b",
      timeSlot: 3,
      fieldIndex: 2,
      homeTeamId: "c",
      awayTeamId: "d",
    });
    const targetMap = new Map<string, TargetClass>([
      ["cell-3-2", "valid-swap"],
    ]);
    const r = previewKindFor("cell-0-0", active, "cell-3-2", targetMap, [
      active,
      partner,
    ]);
    expect(r.kind).toBe("source-partner-ghost");
    if (r.kind === "source-partner-ghost") {
      expect(r.match).toBe(partner);
    }
  });

  it("returns default when hovering an invalid target", () => {
    const active = m({ id: "a", timeSlot: 0, fieldIndex: 0 });
    const targetMap = new Map<string, TargetClass>([["cell-3-2", "invalid"]]);
    expect(
      previewKindFor("cell-3-2", active, "cell-3-2", targetMap, [active])
    ).toEqual({ kind: "default" });
  });

  it("returns default for cells that are neither source nor over", () => {
    const active = m({ id: "a", timeSlot: 0, fieldIndex: 0 });
    const targetMap = new Map<string, TargetClass>([
      ["cell-1-1", "valid-move"],
      ["cell-3-2", "valid-swap"],
    ]);
    expect(
      previewKindFor("cell-1-1", active, "cell-3-2", targetMap, [active])
    ).toEqual({ kind: "default" });
  });

  it("scopes source match by competition to avoid cross-comp match-id collisions", () => {
    // ko-1 exists in both competitions; the active one is mens
    const active = m({ id: "ko-1", competitionId: "mens", timeSlot: 0, fieldIndex: 0 });
    const womensKo1 = m({ id: "ko-1", competitionId: "womens", timeSlot: 5, fieldIndex: 0 });
    const r = previewKindFor("cell-0-0", active, null, new Map(), [
      active,
      womensKo1,
    ]);
    expect(r.kind).toBe("source-dimmed");
  });

  it("ignores insert-* overIds (not a cell, but still safe input)", () => {
    const active = m({ id: "a", timeSlot: 0, fieldIndex: 0 });
    const targetMap = new Map<string, TargetClass>([
      ["insert-2-1", "valid-insert"],
    ]);
    // Source cell is NOT changed to partner-ghost on an insert hover
    expect(
      previewKindFor("cell-0-0", active, "insert-2-1", targetMap, [active])
    ).toEqual({ kind: "source-dimmed" });
    // Random other cell is default
    expect(
      previewKindFor("cell-4-0", active, "insert-2-1", targetMap, [active])
    ).toEqual({ kind: "default" });
  });
});
