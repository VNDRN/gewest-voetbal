import { describe, it, expect, beforeEach, vi } from "vitest";
import { computeMovers, applyFlip } from "../../engine/scheduleFlip";
import type { Change } from "../../engine/scheduleMove";
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

describe("computeMovers", () => {
  it("returns no movers for a plain move into an empty cell", () => {
    const change: Change = {
      kind: "move",
      matchId: "a",
      toSlot: 2,
      toField: 0,
      competitionId: "mens",
    };
    expect(computeMovers(change, [m({ id: "a" })])).toEqual([]);
  });

  it("returns the partner as the sole mover on a swap", () => {
    const change: Change = {
      kind: "swap",
      matchAId: "a",
      matchACompetitionId: "mens",
      matchBId: "b",
      matchBCompetitionId: "womens",
    };
    expect(computeMovers(change, [])).toEqual([{ key: "womens:b" }]);
  });

  it("returns every match at timeSlot >= atSlot (excluding the inserted one) on an insert", () => {
    const matches = [
      m({ id: "a", timeSlot: 0 }),
      m({ id: "b", timeSlot: 2 }),
      m({ id: "c", timeSlot: 3 }),
      m({ id: "moving", timeSlot: 5 }),
    ];
    const change: Change = {
      kind: "insert",
      matchId: "moving",
      atSlot: 2,
      toField: 0,
      competitionId: "mens",
    };
    const movers = computeMovers(change, matches);
    expect(movers).toEqual(
      expect.arrayContaining([{ key: "mens:b" }, { key: "mens:c" }])
    );
    expect(movers).not.toContainEqual({ key: "mens:moving" });
    expect(movers).not.toContainEqual({ key: "mens:a" });
  });
});

describe("applyFlip", () => {
  let oldEl: HTMLElement;
  let refs: Map<string, HTMLElement>;
  let oldRects: Map<string, DOMRect>;

  beforeEach(() => {
    oldEl = document.createElement("div");
    document.body.appendChild(oldEl);
    refs = new Map([["k", oldEl]]);
    oldRects = new Map([
      ["k", new DOMRect(10, 20, 100, 100)],
    ]);
    vi.spyOn(oldEl, "getBoundingClientRect").mockReturnValue(
      new DOMRect(50, 80, 100, 100)
    );
  });

  it("applies inverse transform synchronously, then transitions back to identity", () => {
    applyFlip([{ key: "k" }], oldRects, refs, 250, "ease");
    expect(oldEl.style.transform).toBe("translate(-40px, -60px)");
    expect(oldEl.style.transition).toBe("none");
  });

  it("skips movers where the old and new rects are effectively identical", () => {
    vi.spyOn(oldEl, "getBoundingClientRect").mockReturnValue(
      new DOMRect(10.2, 20.1, 100, 100)
    );
    applyFlip([{ key: "k" }], oldRects, refs, 250, "ease");
    expect(oldEl.style.transform).toBe("");
    expect(oldEl.style.transition).toBe("");
  });

  it("silently skips keys without a matching ref or oldRect", () => {
    expect(() =>
      applyFlip([{ key: "missing" }], new Map(), new Map(), 250, "ease")
    ).not.toThrow();
  });
});
