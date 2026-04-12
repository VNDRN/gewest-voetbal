import { describe, it, expect } from "vitest";
import { createDraft, moveDraftTeam, validateDraft } from "../../engine/draft";
import type { Competition } from "../../types";

function makeCompetition(teamCount: number, groupSize: number): Competition {
  const teams = Array.from({ length: teamCount }, (_, i) => ({
    id: `t${i}`,
    name: `Team ${i}`,
    groupId: "",
  }));
  return {
    id: "comp1",
    name: "Test",
    teams,
    groups: [],
    knockoutRounds: [],
    config: { groupSize, advancingPerGroup: 2, bestNextPlacedCount: 0, knockoutSize: 8 },
  };
}

describe("createDraft", () => {
  it("assigns all teams to groups", () => {
    const comp = makeCompetition(8, 4);
    const groups = createDraft(comp);
    const allTeamIds = groups.flatMap((g) => g.teamIds);
    expect(allTeamIds.sort()).toEqual(comp.teams.map((t) => t.id).sort());
  });

  it("creates correct number of groups based on config", () => {
    const comp = makeCompetition(8, 4);
    const groups = createDraft(comp);
    expect(groups).toHaveLength(2);
  });

  it("names groups alphabetically", () => {
    const comp = makeCompetition(12, 4);
    const groups = createDraft(comp);
    expect(groups.map((g) => g.name)).toEqual(["Groep A", "Groep B", "Groep C"]);
  });

  it("group IDs use competition ID prefix", () => {
    const comp = makeCompetition(8, 4);
    const groups = createDraft(comp);
    for (const g of groups) {
      expect(g.id).toMatch(/^comp1-group-/);
    }
  });

  it("shuffles teams (not always same order)", () => {
    const comp = makeCompetition(12, 4);
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const groups = createDraft(comp);
      results.add(groups.map((g) => g.teamIds.join(",")).join("|"));
    }
    expect(results.size).toBeGreaterThan(1);
  });
});

describe("moveDraftTeam", () => {
  it("moves a team from one group to another", () => {
    const groups = [
      { id: "g1", name: "Groep A", teamIds: ["a", "b", "c", "d"] },
      { id: "g2", name: "Groep B", teamIds: ["e", "f", "g", "h"] },
    ];
    const result = moveDraftTeam(groups, "a", "g2");
    expect(result.find((g) => g.id === "g1")!.teamIds).toEqual(["b", "c", "d"]);
    expect(result.find((g) => g.id === "g2")!.teamIds).toEqual(["e", "f", "g", "h", "a"]);
  });

  it("returns unchanged groups when team already in target group", () => {
    const groups = [
      { id: "g1", name: "Groep A", teamIds: ["a", "b", "c"] },
      { id: "g2", name: "Groep B", teamIds: ["d", "e", "f"] },
    ];
    const result = moveDraftTeam(groups, "a", "g1");
    expect(result).toEqual(groups);
  });

  it("returns unchanged groups when team not found", () => {
    const groups = [
      { id: "g1", name: "Groep A", teamIds: ["a", "b", "c"] },
      { id: "g2", name: "Groep B", teamIds: ["d", "e", "f"] },
    ];
    const result = moveDraftTeam(groups, "z", "g2");
    expect(result).toEqual(groups);
  });

  it("does not mutate original groups", () => {
    const groups = [
      { id: "g1", name: "Groep A", teamIds: ["a", "b", "c", "d"] },
      { id: "g2", name: "Groep B", teamIds: ["e", "f", "g"] },
    ];
    const original = JSON.stringify(groups);
    moveDraftTeam(groups, "a", "g2");
    expect(JSON.stringify(groups)).toBe(original);
  });
});

describe("validateDraft", () => {
  it("returns empty array when all groups have 3-5 teams", () => {
    const groups = [
      { id: "g1", name: "Groep A", teamIds: ["a", "b", "c"] },
      { id: "g2", name: "Groep B", teamIds: ["d", "e", "f", "g"] },
      { id: "g3", name: "Groep C", teamIds: ["h", "i", "j", "k", "l"] },
    ];
    expect(validateDraft(groups)).toEqual([]);
  });

  it("returns error when a group has fewer than 3 teams", () => {
    const groups = [
      { id: "g1", name: "Groep A", teamIds: ["a", "b"] },
      { id: "g2", name: "Groep B", teamIds: ["c", "d", "e", "f", "g"] },
    ];
    const errors = validateDraft(groups);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("Groep A");
  });

  it("returns error when a group has more than 5 teams", () => {
    const groups = [
      { id: "g1", name: "Groep A", teamIds: ["a", "b", "c"] },
      { id: "g2", name: "Groep B", teamIds: ["d", "e", "f", "g", "h", "i"] },
    ];
    const errors = validateDraft(groups);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("Groep B");
  });

  it("returns multiple errors for multiple invalid groups", () => {
    const groups = [
      { id: "g1", name: "Groep A", teamIds: ["a"] },
      { id: "g2", name: "Groep B", teamIds: ["b", "c", "d", "e", "f", "g", "h"] },
    ];
    const errors = validateDraft(groups);
    expect(errors).toHaveLength(2);
  });
});
