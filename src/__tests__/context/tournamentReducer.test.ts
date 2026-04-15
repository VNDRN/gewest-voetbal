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
