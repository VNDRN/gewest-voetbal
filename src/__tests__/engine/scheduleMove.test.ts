import { describe, it, expect } from "vitest";
import { applyChange, validateChange, classifyTargets } from "../../engine/scheduleMove";
import type { ScheduleBreak, ScheduledMatch } from "../../types";

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

describe("validateChange — knockout tier ordering", () => {
  function ko(
    id: string,
    roundIndex: number,
    timeSlot: number,
    fieldIndex: number,
    isThirdPlace = false
  ): ScheduledMatch {
    return m({
      id,
      phase: "knockout",
      timeSlot,
      fieldIndex,
      competitionId: "mens",
      groupName: isThirdPlace ? "3e plaats" : `Ronde ${roundIndex}`,
      homeTeamId: null as unknown as string,
      awayTeamId: null as unknown as string,
    });
  }

  it("rejects moving a QF match to the same slot as an SF match", () => {
    const matches = [
      ko("qf1", 0, 0, 0),
      ko("qf2", 0, 0, 1),
      ko("sf1", 1, 2, 0),
      ko("sf2", 1, 2, 1),
    ];
    const res = validateChange(matches, {
      kind: "move",
      matchId: "qf1",
      toSlot: 2,
      toField: 2,
    }, {
      rounds: [
        { name: "Ronde 0", matchIds: ["qf1", "qf2"], isThirdPlace: false, competitionId: "mens" },
        { name: "Ronde 1", matchIds: ["sf1", "sf2"], isThirdPlace: false, competitionId: "mens" },
      ],
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("round-order");
  });

  it("accepts a third-place match sharing a slot with the final (siblings)", () => {
    const matches = [
      ko("sf1", 1, 2, 0),
      ko("sf2", 1, 2, 1),
      ko("f1", 2, 4, 0),
      ko("tp1", 3, 4, 1, true),
    ];
    const res = validateChange(matches, {
      kind: "move",
      matchId: "tp1",
      toSlot: 4,
      toField: 1,
    }, {
      rounds: [
        { name: "SF", matchIds: ["sf1", "sf2"], isThirdPlace: false, competitionId: "mens" },
        { name: "Finale", matchIds: ["f1"], isThirdPlace: false, competitionId: "mens" },
        { name: "3e plaats", matchIds: ["tp1"], isThirdPlace: true, competitionId: "mens" },
      ],
    });
    expect(res.ok).toBe(true);
  });

  it("rejects a third-place match landing after the final", () => {
    const matches = [
      ko("f1", 2, 4, 0),
      ko("tp1", 3, 5, 0, true),
    ];
    const res = validateChange(matches, {
      kind: "move",
      matchId: "tp1",
      toSlot: 5,
      toField: 0,
    }, {
      rounds: [
        { name: "Finale", matchIds: ["f1"], isThirdPlace: false, competitionId: "mens" },
        { name: "3e plaats", matchIds: ["tp1"], isThirdPlace: true, competitionId: "mens" },
      ],
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("round-order");
  });
});

import { changeFromDragEnd } from "../../engine/scheduleMove";

describe("changeFromDragEnd", () => {
  it("returns a move for drop on an empty cell", () => {
    const matches = [m({ id: "a", timeSlot: 0, fieldIndex: 0 })];
    const c = changeFromDragEnd("a", "cell-2-1", matches);
    expect(c).toEqual({ kind: "move", matchId: "a", toSlot: 2, toField: 1 });
  });

  it("returns a swap for drop on an occupied cell", () => {
    const matches = [
      m({ id: "a", timeSlot: 0, fieldIndex: 0 }),
      m({ id: "b", timeSlot: 2, fieldIndex: 1, homeTeamId: "c", awayTeamId: "d" }),
    ];
    const c = changeFromDragEnd("a", "cell-2-1", matches);
    expect(c).toEqual({ kind: "swap", matchAId: "a", matchBId: "b" });
  });

  it("returns an insert for drop on an insert id", () => {
    const matches = [m({ id: "a", timeSlot: 0, fieldIndex: 0 })];
    const c = changeFromDragEnd("a", "insert-1-2", matches);
    expect(c).toEqual({ kind: "insert", matchId: "a", atSlot: 1, toField: 2 });
  });

  it("returns null for unrecognized over id", () => {
    const matches = [m({ id: "a" })];
    expect(changeFromDragEnd("a", "nope", matches)).toBeNull();
  });

  it("returns null when dropped on source cell", () => {
    const matches = [m({ id: "a", timeSlot: 3, fieldIndex: 1 })];
    const c = changeFromDragEnd("a", "cell-3-1", matches);
    expect(c).toBeNull();
  });
});

describe("classifyTargets", () => {
  const fieldCount = 2;
  const breaks: ScheduleBreak[] = [];

  it("marks empty cells as valid-move and occupied cells with no conflict as valid-swap", () => {
    const matches = [
      m({ id: "a", timeSlot: 0, fieldIndex: 0, homeTeamId: "x", awayTeamId: "y" }),
      m({ id: "b", timeSlot: 0, fieldIndex: 1, homeTeamId: "p", awayTeamId: "q" }),
      m({ id: "c", timeSlot: 1, fieldIndex: 0, homeTeamId: "r", awayTeamId: "s" }),
    ];
    const map = classifyTargets(matches, "a", fieldCount, breaks);
    expect(map.get("cell-0-0")).toBe("valid-move"); // source cell is itself a valid target (no-op, but not rejected)
    expect(map.get("cell-0-1")).toBe("valid-swap"); // swap a<->b, teams disjoint
    expect(map.get("cell-1-0")).toBe("valid-swap");
    expect(map.get("cell-1-1")).toBe("valid-move"); // empty
  });

  it("marks swap targets that would conflict as invalid", () => {
    // Corrected fixture: swap a<->b lands (x,y) in slot 1 alongside c (y,r) → team y double-booked
    const matches = [
      m({ id: "a", timeSlot: 0, fieldIndex: 0, homeTeamId: "x", awayTeamId: "y" }),
      m({ id: "b", timeSlot: 1, fieldIndex: 0, homeTeamId: "p", awayTeamId: "q" }),
      m({ id: "c", timeSlot: 1, fieldIndex: 1, homeTeamId: "y", awayTeamId: "r" }),
    ];
    const map = classifyTargets(matches, "a", fieldCount, breaks);
    expect(map.get("cell-1-0")).toBe("invalid");
  });

  it("generates insert ids between every pair of rows and around breaks", () => {
    const matches = [
      m({ id: "a", timeSlot: 0, fieldIndex: 0 }),
      m({ id: "b", timeSlot: 1, fieldIndex: 0, homeTeamId: "c", awayTeamId: "d" }),
    ];
    const withBreak: ScheduleBreak[] = [
      { id: "br1", afterTimeSlot: 0, durationMinutes: 10 },
    ];
    const map = classifyTargets(matches, "a", fieldCount, withBreak);
    expect(map.has("insert-0-0")).toBe(true); // above row 0
    expect(map.has("insert-1-0")).toBe(true); // between slots 0 and 1 (also bracketing break)
    expect(map.has("insert-2-0")).toBe(true); // below slot 1
    // Above-break strip gets its own distinct droppable id so dnd-kit can detect
    // both sides of the break without colliding.
    expect(map.has("insert-pre-1-0")).toBe(true);
    expect(map.get("insert-pre-1-0")).toBe(map.get("insert-1-0"));
  });
});

describe("changeFromDragEnd — insert-pre id", () => {
  it("derives the same Change from insert-pre as from insert", () => {
    const matches = [m({ id: "a", timeSlot: 0, fieldIndex: 0 })];
    const c1 = changeFromDragEnd("a", "insert-1-0", matches);
    const c2 = changeFromDragEnd("a", "insert-pre-1-0", matches);
    expect(c1).toEqual(c2);
    expect(c2).toEqual({
      kind: "insert",
      matchId: "a",
      atSlot: 1,
      toField: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// competition scoping — applyChange
// ---------------------------------------------------------------------------

describe("applyChange — competition scoping", () => {
  it("moves only the match whose competitionId matches when ids collide across competitions", () => {
    const matches = [
      m({ id: "ko-1", competitionId: "mens", timeSlot: 0, fieldIndex: 0 }),
      m({ id: "ko-1", competitionId: "womens", timeSlot: 0, fieldIndex: 1, homeTeamId: "c", awayTeamId: "d" }),
    ];
    const next = applyChange(matches, {
      kind: "move",
      matchId: "ko-1",
      toSlot: 2,
      toField: 0,
      competitionId: "mens",
    });
    const mens = next.find((n) => n.competitionId === "mens")!;
    const womens = next.find((n) => n.competitionId === "womens")!;
    expect(mens.timeSlot).toBe(2);
    expect(womens.timeSlot).toBe(0); // untouched
  });

  it("swaps only the correct competition's pair when ids collide", () => {
    const matches = [
      m({ id: "ko-1", competitionId: "mens", timeSlot: 0, fieldIndex: 0 }),
      m({ id: "ko-2", competitionId: "mens", timeSlot: 1, fieldIndex: 0, homeTeamId: "c", awayTeamId: "d" }),
      m({ id: "ko-1", competitionId: "womens", timeSlot: 0, fieldIndex: 1, homeTeamId: "e", awayTeamId: "f" }),
      m({ id: "ko-2", competitionId: "womens", timeSlot: 1, fieldIndex: 1, homeTeamId: "g", awayTeamId: "h" }),
    ];
    const next = applyChange(matches, {
      kind: "swap",
      matchAId: "ko-1",
      matchBId: "ko-2",
      competitionId: "mens",
    });
    const mensKo1 = next.find((n) => n.id === "ko-1" && n.competitionId === "mens")!;
    const mensKo2 = next.find((n) => n.id === "ko-2" && n.competitionId === "mens")!;
    const womensKo1 = next.find((n) => n.id === "ko-1" && n.competitionId === "womens")!;
    const womensKo2 = next.find((n) => n.id === "ko-2" && n.competitionId === "womens")!;
    expect(mensKo1.timeSlot).toBe(1);
    expect(mensKo2.timeSlot).toBe(0);
    expect(womensKo1.timeSlot).toBe(0); // untouched
    expect(womensKo2.timeSlot).toBe(1); // untouched
  });
});

// ---------------------------------------------------------------------------
// competition scoping — classifyTargets
// ---------------------------------------------------------------------------

describe("classifyTargets — competition scoping", () => {
  const fieldCount = 2;
  const breaks: ScheduleBreak[] = [];

  it("marks a cell occupied by the other competition as invalid (no cross-competition swap)", () => {
    const matches = [
      m({ id: "a", competitionId: "mens",   timeSlot: 0, fieldIndex: 0, homeTeamId: "x", awayTeamId: "y" }),
      m({ id: "b", competitionId: "womens", timeSlot: 1, fieldIndex: 0, homeTeamId: "p", awayTeamId: "q" }),
    ];
    const map = classifyTargets(matches, "a", fieldCount, breaks, { rounds: [] }, "mens");
    expect(map.get("cell-1-0")).toBe("invalid");
  });

  it("marks same-competition occupant with no team conflict as valid-swap", () => {
    const matches = [
      m({ id: "a", competitionId: "mens", timeSlot: 0, fieldIndex: 0, homeTeamId: "x", awayTeamId: "y" }),
      m({ id: "b", competitionId: "mens", timeSlot: 1, fieldIndex: 0, homeTeamId: "p", awayTeamId: "q" }),
    ];
    const map = classifyTargets(matches, "a", fieldCount, breaks, { rounds: [] }, "mens");
    expect(map.get("cell-1-0")).toBe("valid-swap");
  });
});

// ---------------------------------------------------------------------------
// competition scoping — changeFromDragEnd
// ---------------------------------------------------------------------------

describe("changeFromDragEnd — competition scoping", () => {
  it("returns a move (not a swap) when cell is occupied by a different competition", () => {
    const matches = [
      m({ id: "a", competitionId: "mens",   timeSlot: 0, fieldIndex: 0 }),
      m({ id: "b", competitionId: "womens", timeSlot: 2, fieldIndex: 1, homeTeamId: "c", awayTeamId: "d" }),
    ];
    const c = changeFromDragEnd("a", "cell-2-1", matches, "mens");
    // womens occupant is invisible to mens drag — treat cell as empty → move
    expect(c).toEqual({ kind: "move", matchId: "a", toSlot: 2, toField: 1, competitionId: "mens" });
  });

  it("includes competitionId in all returned change types", () => {
    const matches = [
      m({ id: "a", competitionId: "mens", timeSlot: 0, fieldIndex: 0 }),
      m({ id: "b", competitionId: "mens", timeSlot: 2, fieldIndex: 1, homeTeamId: "c", awayTeamId: "d" }),
    ];
    const move = changeFromDragEnd("a", "cell-3-0", matches, "mens");
    expect(move).toMatchObject({ kind: "move", competitionId: "mens" });

    const swap = changeFromDragEnd("a", "cell-2-1", matches, "mens");
    expect(swap).toMatchObject({ kind: "swap", competitionId: "mens" });

    const insert = changeFromDragEnd("a", "insert-1-0", matches, "mens");
    expect(insert).toMatchObject({ kind: "insert", competitionId: "mens" });
  });
});

// ---------------------------------------------------------------------------
// phase ordering — group matches must precede knockout matches
// ---------------------------------------------------------------------------

describe("validateChange — phase order", () => {
  function group(id: string, timeSlot: number, fieldIndex = 0): ScheduledMatch {
    return m({ id, phase: "group", timeSlot, fieldIndex, competitionId: "mens" });
  }
  function ko(id: string, timeSlot: number, fieldIndex = 0): ScheduledMatch {
    return m({
      id,
      phase: "knockout",
      timeSlot,
      fieldIndex,
      competitionId: "mens",
      homeTeamId: null as unknown as string,
      awayTeamId: null as unknown as string,
    });
  }

  it("rejects moving a group match to the same timeslot as a knockout match", () => {
    const matches = [group("g1", 0), ko("k1", 2, 1)];
    const res = validateChange(matches, { kind: "move", matchId: "g1", toSlot: 2, toField: 0 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("phase-order");
  });

  it("rejects moving a group match past all knockout matches", () => {
    const matches = [group("g1", 0), ko("k1", 2)];
    const res = validateChange(matches, { kind: "move", matchId: "g1", toSlot: 3, toField: 0 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("phase-order");
  });

  it("accepts moving a group match to a slot strictly before all knockout matches", () => {
    const matches = [group("g1", 0), group("g2", 1, 1), ko("k1", 3)];
    const res = validateChange(matches, { kind: "move", matchId: "g1", toSlot: 2, toField: 0 });
    expect(res.ok).toBe(true);
  });

  it("does not apply the phase constraint across competitions", () => {
    // womens group at the same slot as mens knockout is fine
    const matches = [
      m({ id: "g1", phase: "group",    competitionId: "womens", timeSlot: 2, fieldIndex: 1 }),
      m({ id: "k1", phase: "knockout", competitionId: "mens",   timeSlot: 2, fieldIndex: 0,
          homeTeamId: null as unknown as string, awayTeamId: null as unknown as string }),
    ];
    const res = validateChange(matches, { kind: "move", matchId: "g1", toSlot: 2, toField: 1, competitionId: "womens" });
    expect(res.ok).toBe(true);
  });

  it("rejects swapping a group match into a knockout slot", () => {
    const matches = [group("g1", 0), ko("k1", 2)];
    const res = validateChange(matches, { kind: "swap", matchAId: "g1", matchBId: "k1" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("phase-order");
  });
});
