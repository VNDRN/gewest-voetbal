import { describe, it, expect } from "vitest";
import {
  exportToJson,
  parseImportedJson,
} from "../../persistence/exportImport";
import type { Tournament } from "../../types";

function makeTournament(): Tournament {
  return {
    id: "t1",
    name: "Test Cup",
    date: "2026-04-11",
    config: { fieldCount: 2, slotDurationMinutes: 20, startTime: "09:00", breaks: [] },
    competitions: [
      {
        id: "mens",
        name: "Men's",
        teams: [
          { id: "a", name: "Alpha", groupId: "g1" },
          { id: "b", name: "Bravo", groupId: "g1" },
          { id: "c", name: "Charlie", groupId: "g1" },
        ],
        groups: [
          {
            id: "g1",
            name: "Group A",
            teamIds: ["a", "b", "c"],
            matches: [
              {
                id: "m1",
                homeTeamId: "a",
                awayTeamId: "b",
                fieldIndex: 0,
                timeSlot: 0,
                score: { home: 2, away: 1 },
                phase: "group",
              },
              {
                id: "m2",
                homeTeamId: "a",
                awayTeamId: "c",
                fieldIndex: 1,
                timeSlot: 0,
                score: null,
                phase: "group",
              },
              {
                id: "m3",
                homeTeamId: "b",
                awayTeamId: "c",
                fieldIndex: 0,
                timeSlot: 1,
                score: null,
                phase: "group",
              },
            ],
          },
        ],
        knockoutRounds: [],
        config: {
          groupSize: 3,
          advancingPerGroup: 1,
          bestNextPlacedCount: 0,
          knockoutSize: 2,
        },
      },
      {
        id: "womens",
        name: "Women's",
        teams: [],
        groups: [],
        knockoutRounds: [],
        config: {
          groupSize: 4,
          advancingPerGroup: 2,
          bestNextPlacedCount: 0,
          knockoutSize: 8,
        },
      },
    ],
  };
}

describe("exportToJson / parseImportedJson", () => {
  it("round-trips: export then import equals original", () => {
    const original = makeTournament();
    const json = exportToJson(original);
    const imported = parseImportedJson(json);
    expect(imported).toEqual(original);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseImportedJson("not json at all")).toThrow("Ongeldig JSON");
  });

  it("throws on missing id field", () => {
    const bad = { name: "x", date: "x", config: {}, competitions: [{}, {}] };
    expect(() => parseImportedJson(JSON.stringify(bad))).toThrow("Ontbrekend veld: id");
  });

  it("throws on missing name field", () => {
    const bad = { id: "x", date: "x", config: {}, competitions: [{}, {}] };
    expect(() => parseImportedJson(JSON.stringify(bad))).toThrow("Ontbrekend veld: name");
  });

  it("throws on missing date field", () => {
    const bad = { id: "x", name: "x", config: {}, competitions: [{}, {}] };
    expect(() => parseImportedJson(JSON.stringify(bad))).toThrow("Ontbrekend veld: date");
  });

  it("throws on missing config field", () => {
    const bad = { id: "x", name: "x", date: "x", competitions: [{}, {}] };
    expect(() => parseImportedJson(JSON.stringify(bad))).toThrow("Ontbrekend veld: config");
  });

  it("throws on missing competitions field", () => {
    const bad = { id: "x", name: "x", date: "x", config: {} };
    expect(() => parseImportedJson(JSON.stringify(bad))).toThrow(
      "Ontbrekend veld: competitions"
    );
  });

  it("throws when competitions has wrong length", () => {
    const bad = { id: "x", name: "x", date: "x", config: {}, competitions: [{}] };
    expect(() => parseImportedJson(JSON.stringify(bad))).toThrow(
      "Ontbrekend veld: competitions"
    );
  });
});
