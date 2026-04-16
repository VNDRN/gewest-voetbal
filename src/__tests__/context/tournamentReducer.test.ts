import { describe, it, expect } from "vitest";
import { tournamentReducer } from "../../context/TournamentContext";
import type { Tournament } from "../../types";

function makeTournament(): Tournament {
  return {
    id: "t1",
    name: "Test",
    date: "2026-04-15",
    config: {
      fieldCount: 2,
      slotDurationMinutes: 20,
      startTime: "09:00",
      breaks: [],
      slotCount: 3,
    },
    competitions: [
      {
        id: "mens",
        name: "Heren",
        teams: [],
        groups: [
          {
            id: "g1",
            name: "Groep A",
            teamIds: ["a", "b", "c"],
            matches: [
              { id: "m0", homeTeamId: "a", awayTeamId: "b", fieldIndex: 0, timeSlot: 0, score: null, phase: "group" },
              { id: "m1", homeTeamId: "b", awayTeamId: "c", fieldIndex: 0, timeSlot: 1, score: null, phase: "group" },
              { id: "m2", homeTeamId: "a", awayTeamId: "c", fieldIndex: 0, timeSlot: 2, score: null, phase: "group" },
            ],
          },
        ],
        knockoutRounds: [],
        config: { groupSize: 3, advancingPerGroup: 2, bestNextPlacedCount: 0, knockoutSize: 4 },
      },
      {
        id: "womens",
        name: "Dames",
        teams: [],
        groups: [],
        knockoutRounds: [],
        config: { groupSize: 3, advancingPerGroup: 2, bestNextPlacedCount: 0, knockoutSize: 4 },
      },
    ],
  };
}

describe("ADD_SLOT", () => {
  it("inserts a slot in the middle, shifting later matches by +1 and incrementing slotCount", () => {
    const next = tournamentReducer(makeTournament(), { type: "ADD_SLOT", atSlot: 1 });
    const matches = next.competitions[0].groups[0].matches;
    expect(next.config.slotCount).toBe(4);
    expect(matches.find((m) => m.id === "m0")!.timeSlot).toBe(0);
    expect(matches.find((m) => m.id === "m1")!.timeSlot).toBe(2);
    expect(matches.find((m) => m.id === "m2")!.timeSlot).toBe(3);
  });

  it("inserting at atSlot=0 shifts every match by +1", () => {
    const next = tournamentReducer(makeTournament(), { type: "ADD_SLOT", atSlot: 0 });
    const matches = next.competitions[0].groups[0].matches;
    expect(next.config.slotCount).toBe(4);
    expect(matches.find((m) => m.id === "m0")!.timeSlot).toBe(1);
    expect(matches.find((m) => m.id === "m1")!.timeSlot).toBe(2);
    expect(matches.find((m) => m.id === "m2")!.timeSlot).toBe(3);
  });

  it("inserting at atSlot=slotCount appends a trailing empty slot and leaves matches alone", () => {
    const next = tournamentReducer(makeTournament(), { type: "ADD_SLOT", atSlot: 3 });
    const matches = next.competitions[0].groups[0].matches;
    expect(next.config.slotCount).toBe(4);
    expect(matches.find((m) => m.id === "m0")!.timeSlot).toBe(0);
    expect(matches.find((m) => m.id === "m1")!.timeSlot).toBe(1);
    expect(matches.find((m) => m.id === "m2")!.timeSlot).toBe(2);
  });

  it("shifts breaks whose afterTimeSlot >= atSlot", () => {
    const t = makeTournament();
    t.config.breaks = [
      { id: "br0", afterTimeSlot: 0, durationMinutes: 10 },
      { id: "br1", afterTimeSlot: 1, durationMinutes: 5 },
    ];
    const next = tournamentReducer(t, { type: "ADD_SLOT", atSlot: 1 });
    expect(next.config.breaks.find((b) => b.id === "br0")!.afterTimeSlot).toBe(0);
    expect(next.config.breaks.find((b) => b.id === "br1")!.afterTimeSlot).toBe(2);
  });
});

describe("APPLY_SCHEDULE_CHANGE — no compression", () => {
  it("a move that leaves an empty slot preserves slotCount and the empty row", () => {
    // Use non-overlapping teams so the move passes team-conflict validation.
    // m1 (d vs e) is at slot 1 field 0. Move it to slot 0 field 1 (empty).
    // After the move: slot 1 is empty, m2 must stay at slot 2.
    const t = makeTournament();
    t.competitions[0].groups[0].matches = [
      { id: "m0", homeTeamId: "a", awayTeamId: "b", fieldIndex: 0, timeSlot: 0, score: null, phase: "group" },
      { id: "m1", homeTeamId: "d", awayTeamId: "e", fieldIndex: 0, timeSlot: 1, score: null, phase: "group" },
      { id: "m2", homeTeamId: "x", awayTeamId: "y", fieldIndex: 0, timeSlot: 2, score: null, phase: "group" },
    ];
    const next = tournamentReducer(t, {
      type: "APPLY_SCHEDULE_CHANGE",
      change: {
        kind: "move",
        matchId: "m1",
        toSlot: 0,
        toField: 1,
        competitionId: "mens",
      },
    });
    expect(next.config.slotCount).toBe(3);
    const matches = next.competitions[0].groups[0].matches;
    expect(matches.find((m) => m.id === "m1")!.timeSlot).toBe(0);
    // Slot 1 is now empty — but m2 must NOT have compressed down into slot 1.
    expect(matches.find((m) => m.id === "m2")!.timeSlot).toBe(2);
  });
});

describe("REMOVE_SLOT", () => {
  it("removes an empty slot, shifts later matches up by 1, decrements slotCount", () => {
    // Fixture has matches at slots 0,1,2. Add an empty slot at 1 (matches shift to 0,2,3), then remove slot 1.
    const base = makeTournament();
    const withEmpty = tournamentReducer(base, { type: "ADD_SLOT", atSlot: 1 });
    // Sanity: slotCount 4, matches at 0, 2, 3
    expect(withEmpty.config.slotCount).toBe(4);

    const next = tournamentReducer(withEmpty, { type: "REMOVE_SLOT", slot: 1 });
    const matches = next.competitions[0].groups[0].matches;
    expect(next.config.slotCount).toBe(3);
    expect(matches.find((m) => m.id === "m0")!.timeSlot).toBe(0);
    expect(matches.find((m) => m.id === "m1")!.timeSlot).toBe(1);
    expect(matches.find((m) => m.id === "m2")!.timeSlot).toBe(2);
  });

  it("no-ops when the target slot is occupied", () => {
    const t = makeTournament();
    const next = tournamentReducer(t, { type: "REMOVE_SLOT", slot: 1 });
    expect(next).toBe(t);
  });

  it("shifts breaks with afterTimeSlot > slot, keeps breaks anchored at slot, decrements slotCount", () => {
    const base = makeTournament();
    base.config.slotCount = 5;
    // Add empty slot at 2 so we can remove it
    base.competitions[0].groups[0].matches = base.competitions[0].groups[0].matches.map((mm) =>
      mm.timeSlot >= 2 ? { ...mm, timeSlot: mm.timeSlot + 1 } : mm
    );
    base.config.breaks = [
      { id: "br-a", afterTimeSlot: 0, durationMinutes: 10 }, // before removed — unchanged
      { id: "br-b", afterTimeSlot: 2, durationMinutes: 5 },  // anchored at removed slot — stays
      { id: "br-c", afterTimeSlot: 3, durationMinutes: 7 },  // after — shifts down to 2
    ];
    const next = tournamentReducer(base, { type: "REMOVE_SLOT", slot: 2 });
    expect(next.config.slotCount).toBe(4);
    expect(next.config.breaks.find((b) => b.id === "br-a")!.afterTimeSlot).toBe(0);
    expect(next.config.breaks.find((b) => b.id === "br-b")!.afterTimeSlot).toBe(2);
    expect(next.config.breaks.find((b) => b.id === "br-c")!.afterTimeSlot).toBe(2);
  });
});

describe("SET_GROUPS slotCount reset", () => {
  it("recomputes slotCount = maxMatchTimeSlot + 1 and drops out-of-range breaks", () => {
    const t = makeTournament();
    // Pre-state: inflated slotCount 10 (e.g. from prior manual slots), break anchored at slot 7 (beyond new groups).
    t.config.slotCount = 10;
    t.config.breaks = [
      { id: "in-range", afterTimeSlot: 1, durationMinutes: 10 },
      { id: "out-of-range", afterTimeSlot: 7, durationMinutes: 10 },
    ];
    const next = tournamentReducer(t, {
      type: "SET_GROUPS",
      competitionId: "mens",
      groups: [
        {
          id: "g1",
          name: "Groep A",
          teamIds: ["a", "b", "c"],
          matches: [
            { id: "m0", homeTeamId: "a", awayTeamId: "b", fieldIndex: 0, timeSlot: 0, score: null, phase: "group" },
            { id: "m1", homeTeamId: "b", awayTeamId: "c", fieldIndex: 0, timeSlot: 1, score: null, phase: "group" },
          ],
        },
      ],
    });
    expect(next.config.slotCount).toBe(2);
    expect(next.config.breaks.map((b) => b.id)).toEqual(["in-range"]);
  });
});

describe("SET_KNOCKOUT_ROUNDS grows slotCount", () => {
  it("expands slotCount to cover knockout matches beyond current range", () => {
    const t = makeTournament();
    // Group matches at slots 0,1,2; slotCount=3
    const next = tournamentReducer(t, {
      type: "SET_KNOCKOUT_ROUNDS",
      competitionId: "mens",
      knockoutRounds: [
        {
          name: "Halve finale",
          matches: [
            { id: "ko-1", homeTeamId: "a", awayTeamId: "b", fieldIndex: 0, timeSlot: 4, score: null, phase: "knockout" as const, homeSourceDescription: "#1A", awaySourceDescription: "#2A" },
            { id: "ko-2", homeTeamId: null, awayTeamId: null, fieldIndex: 1, timeSlot: 4, score: null, phase: "knockout" as const, homeSourceDescription: "#1B", awaySourceDescription: "#2B" },
          ],
        },
      ],
    });
    expect(next.config.slotCount).toBe(5);
  });
});
