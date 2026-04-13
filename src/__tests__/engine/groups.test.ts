import { describe, it, expect } from "vitest";
import {
  getGroupOptions,
  generateRoundRobinMatches,
  calculateBracketFill,
  maxAdvancingPerGroup,
  getAdvancingOptions,
} from "../../engine/groups";

describe("getGroupOptions", () => {
  describe("basic valid configurations", () => {
    it("returns options including 2×4 for 8 teams", () => {
      const options = getGroupOptions(8);
      expect(options).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ groupCount: 2, sizes: [4, 4] }),
        ])
      );
    });

    it("returns options including 3×3 for 9 teams", () => {
      const options = getGroupOptions(9);
      expect(options).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ groupCount: 3, sizes: [3, 3, 3] }),
        ])
      );
    });

    it("returns options including 4×3 and 3×4 for 12 teams", () => {
      const options = getGroupOptions(12);
      expect(options).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ groupCount: 4, sizes: [3, 3, 3, 3] }),
          expect.objectContaining({ groupCount: 3, sizes: [4, 4, 4] }),
        ])
      );
    });

    it("returns a mixed option summing to 11 for 11 teams", () => {
      const options = getGroupOptions(11);
      for (const opt of options) {
        const sum = opt.sizes.reduce((a, b) => a + b, 0);
        expect(sum).toBe(11);
      }
      expect(options.length).toBeGreaterThan(0);
    });
  });

  describe("boundary conditions", () => {
    it("returns empty for fewer than 4 teams", () => {
      expect(getGroupOptions(0)).toEqual([]);
      expect(getGroupOptions(1)).toEqual([]);
      expect(getGroupOptions(2)).toEqual([]);
      expect(getGroupOptions(3)).toEqual([]);
    });

    it("returns exactly one option for 4 teams (1×4)", () => {
      const options = getGroupOptions(4);
      expect(options).toHaveLength(1);
      expect(options[0]).toEqual(
        expect.objectContaining({ groupCount: 1, sizes: [4], label: "1x4" })
      );
    });

    it("returns exactly one option for 5 teams (1×5)", () => {
      const options = getGroupOptions(5);
      expect(options).toHaveLength(1);
      expect(options[0]).toEqual(
        expect.objectContaining({ groupCount: 1, sizes: [5], label: "1x5" })
      );
    });

    it("returns exactly one option for 6 teams (2×3)", () => {
      const options = getGroupOptions(6);
      expect(options).toHaveLength(1);
      expect(options[0]).toEqual(
        expect.objectContaining({ groupCount: 2, sizes: [3, 3] })
      );
    });

    it("returns a valid mixed option for 7 teams (1×4 + 1×3)", () => {
      const options = getGroupOptions(7);
      expect(options.length).toBeGreaterThan(0);
      const hasMixed = options.some(
        (opt) =>
          opt.sizes.length === 2 &&
          opt.sizes.includes(4) &&
          opt.sizes.includes(3)
      );
      expect(hasMixed).toBe(true);
    });

    it("returns multiple options for 24 teams", () => {
      const options = getGroupOptions(24);
      expect(options.length).toBeGreaterThan(1);
      expect(options).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ groupCount: 8, sizes: [3, 3, 3, 3, 3, 3, 3, 3] }),
          expect.objectContaining({ groupCount: 6, sizes: [4, 4, 4, 4, 4, 4] }),
        ])
      );
    });

    it("handles 13 teams (awkward number)", () => {
      const options = getGroupOptions(13);
      expect(options.length).toBeGreaterThan(0);
      for (const opt of options) {
        const sum = opt.sizes.reduce((a, b) => a + b, 0);
        expect(sum).toBe(13);
      }
    });
  });

  describe("invariants", () => {
    it("all sizes in every option are between 3 and 5", () => {
      for (let n = 4; n <= 24; n++) {
        const options = getGroupOptions(n);
        for (const opt of options) {
          for (const size of opt.sizes) {
            expect(size).toBeGreaterThanOrEqual(3);
            expect(size).toBeLessThanOrEqual(5);
          }
        }
      }
    });

    it("every option has at least 1 group", () => {
      for (let n = 4; n <= 24; n++) {
        const options = getGroupOptions(n);
        for (const opt of options) {
          expect(opt.groupCount).toBeGreaterThanOrEqual(1);
          expect(opt.sizes.length).toBe(opt.groupCount);
        }
      }
    });

    it("sizes always sum to the input team count", () => {
      for (let n = 4; n <= 24; n++) {
        const options = getGroupOptions(n);
        for (const opt of options) {
          const sum = opt.sizes.reduce((a, b) => a + b, 0);
          expect(sum).toBe(n);
        }
      }
    });

    it("has no duplicate options in results", () => {
      for (let n = 4; n <= 24; n++) {
        const options = getGroupOptions(n);
        const labels = options.map((o) => o.label);
        const uniqueLabels = new Set(labels);
        expect(uniqueLabels.size).toBe(labels.length);

        const sizeKeys = options.map((o) => JSON.stringify(o.sizes.slice().sort()));
        const uniqueSizeKeys = new Set(sizeKeys);
        expect(uniqueSizeKeys.size).toBe(sizeKeys.length);
      }
    });

    it("sizes within an option are sorted descending", () => {
      for (let n = 4; n <= 24; n++) {
        const options = getGroupOptions(n);
        for (const opt of options) {
          for (let i = 0; i < opt.sizes.length - 1; i++) {
            expect(opt.sizes[i]).toBeGreaterThanOrEqual(opt.sizes[i + 1]);
          }
        }
      }
    });

    it("every team count from 4-24 has at least one valid option", () => {
      for (let n = 4; n <= 24; n++) {
        const options = getGroupOptions(n);
        expect(options.length).toBeGreaterThanOrEqual(1);
      }
    });

    it("label is a human-readable string", () => {
      for (let n = 4; n <= 24; n++) {
        const options = getGroupOptions(n);
        for (const opt of options) {
          expect(typeof opt.label).toBe("string");
          expect(opt.label.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("specific team counts", () => {
    it("10 teams has option 2×5", () => {
      const options = getGroupOptions(10);
      expect(options).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ groupCount: 2, sizes: [5, 5] }),
        ])
      );
    });

    it("15 teams has options 5×3 and 3×5", () => {
      const options = getGroupOptions(15);
      expect(options).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ groupCount: 5, sizes: [3, 3, 3, 3, 3] }),
          expect.objectContaining({ groupCount: 3, sizes: [5, 5, 5] }),
        ])
      );
    });

    it("16 teams has option 4×4", () => {
      const options = getGroupOptions(16);
      expect(options).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ groupCount: 4, sizes: [4, 4, 4, 4] }),
        ])
      );
    });

    it("20 teams has options 4×5 and 5×4", () => {
      const options = getGroupOptions(20);
      expect(options).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ groupCount: 4, sizes: [5, 5, 5, 5] }),
          expect.objectContaining({ groupCount: 5, sizes: [4, 4, 4, 4, 4] }),
        ])
      );
    });

    it("14 teams: mixed options that sum to 14", () => {
      const options = getGroupOptions(14);
      expect(options.length).toBeGreaterThan(0);
      for (const opt of options) {
        expect(opt.sizes.reduce((a, b) => a + b, 0)).toBe(14);
      }
    });

    it("17 teams: mixed options that sum to 17", () => {
      const options = getGroupOptions(17);
      expect(options.length).toBeGreaterThan(0);
      for (const opt of options) {
        expect(opt.sizes.reduce((a, b) => a + b, 0)).toBe(17);
      }
    });
  });
});

describe("generateRoundRobinMatches", () => {
  describe("match count correctness", () => {
    it("generates 3 matches for 3 teams (3*2/2)", () => {
      const matches = generateRoundRobinMatches(["a", "b", "c"], "g1");
      expect(matches).toHaveLength(3);
    });

    it("generates 6 matches for 4 teams (4*3/2)", () => {
      const matches = generateRoundRobinMatches(["a", "b", "c", "d"], "g1");
      expect(matches).toHaveLength(6);
    });

    it("generates 10 matches for 5 teams (5*4/2)", () => {
      const matches = generateRoundRobinMatches(
        ["a", "b", "c", "d", "e"],
        "g1"
      );
      expect(matches).toHaveLength(10);
    });

    it("generates 1 match for 2 teams (minimum valid pair)", () => {
      const matches = generateRoundRobinMatches(["a", "b"], "g1");
      expect(matches).toHaveLength(1);
    });

    it("generates n*(n-1)/2 matches for arbitrary sizes", () => {
      for (let n = 2; n <= 8; n++) {
        const teamIds = Array.from({ length: n }, (_, i) => `team-${i}`);
        const matches = generateRoundRobinMatches(teamIds, "g1");
        expect(matches).toHaveLength((n * (n - 1)) / 2);
      }
    });
  });

  describe("match properties", () => {
    it("all matches have phase 'group'", () => {
      const matches = generateRoundRobinMatches(["a", "b", "c", "d"], "g1");
      for (const match of matches) {
        expect(match.phase).toBe("group");
      }
    });

    it("all matches have null score", () => {
      const matches = generateRoundRobinMatches(["a", "b", "c", "d"], "g1");
      for (const match of matches) {
        expect(match.score).toBeNull();
      }
    });

    it("all matches have fieldIndex -1 (unassigned)", () => {
      const matches = generateRoundRobinMatches(["a", "b", "c", "d"], "g1");
      for (const match of matches) {
        expect(match.fieldIndex).toBe(-1);
      }
    });

    it("all matches have timeSlot -1 (unassigned)", () => {
      const matches = generateRoundRobinMatches(["a", "b", "c", "d"], "g1");
      for (const match of matches) {
        expect(match.timeSlot).toBe(-1);
      }
    });
  });

  describe("match uniqueness and correctness", () => {
    it("all match IDs are unique", () => {
      const matches = generateRoundRobinMatches(
        ["a", "b", "c", "d", "e"],
        "g1"
      );
      const ids = matches.map((m) => m.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("match IDs are unique across different groups", () => {
      const m1 = generateRoundRobinMatches(["a", "b", "c"], "g1");
      const m2 = generateRoundRobinMatches(["d", "e", "f"], "g2");
      const allIds = [...m1, ...m2].map((m) => m.id);
      expect(new Set(allIds).size).toBe(allIds.length);
    });

    it("both teams in every match are from the input array", () => {
      const teamIds = ["alpha", "beta", "gamma", "delta"];
      const matches = generateRoundRobinMatches(teamIds, "g1");
      for (const match of matches) {
        expect(teamIds).toContain(match.homeTeamId);
        expect(teamIds).toContain(match.awayTeamId);
      }
    });

    it("no team plays itself", () => {
      const teamIds = ["a", "b", "c", "d", "e"];
      const matches = generateRoundRobinMatches(teamIds, "g1");
      for (const match of matches) {
        expect(match.homeTeamId).not.toBe(match.awayTeamId);
      }
    });

    it("every pair of teams plays exactly once", () => {
      const teamIds = ["a", "b", "c", "d"];
      const matches = generateRoundRobinMatches(teamIds, "g1");
      const pairs = new Set<string>();
      for (const match of matches) {
        const key = [match.homeTeamId, match.awayTeamId].sort().join("-");
        expect(pairs.has(key)).toBe(false);
        pairs.add(key);
      }
      // every pair should exist
      for (let i = 0; i < teamIds.length; i++) {
        for (let j = i + 1; j < teamIds.length; j++) {
          const key = [teamIds[i], teamIds[j]].sort().join("-");
          expect(pairs.has(key)).toBe(true);
        }
      }
    });

    it("every team appears in the correct number of matches", () => {
      const teamIds = ["a", "b", "c", "d", "e"];
      const matches = generateRoundRobinMatches(teamIds, "g1");
      const appearances: Record<string, number> = {};
      for (const id of teamIds) appearances[id] = 0;
      for (const match of matches) {
        appearances[match.homeTeamId]++;
        appearances[match.awayTeamId]++;
      }
      // each team should play n-1 matches
      for (const id of teamIds) {
        expect(appearances[id]).toBe(teamIds.length - 1);
      }
    });
  });

  describe("edge cases", () => {
    it("handles single team gracefully (0 matches)", () => {
      const matches = generateRoundRobinMatches(["only"], "g1");
      expect(matches).toHaveLength(0);
    });

    it("handles empty team list (0 matches)", () => {
      const matches = generateRoundRobinMatches([], "g1");
      expect(matches).toHaveLength(0);
    });

    it("works with large groups (8 teams)", () => {
      const teamIds = Array.from({ length: 8 }, (_, i) => `t${i}`);
      const matches = generateRoundRobinMatches(teamIds, "g1");
      expect(matches).toHaveLength(28); // 8*7/2
    });
  });
});

describe("calculateBracketFill", () => {
  describe("basic calculations", () => {
    it("4 groups, 2 advancing → knockout 8, 0 best-next", () => {
      const result = calculateBracketFill(4, 2);
      expect(result.knockoutSize).toBe(8);
      expect(result.bestNextPlacedCount).toBe(0);
    });

    it("4 groups, 1 advancing → knockout 4, 0 best-next", () => {
      const result = calculateBracketFill(4, 1);
      expect(result.knockoutSize).toBe(4);
      expect(result.bestNextPlacedCount).toBe(0);
    });

    it("3 groups, 2 advancing → knockout 8, 2 best-next", () => {
      const result = calculateBracketFill(3, 2);
      expect(result.knockoutSize).toBe(8);
      expect(result.bestNextPlacedCount).toBe(2);
    });

    it("3 groups, 1 advancing → knockout 4, 1 best-next", () => {
      const result = calculateBracketFill(3, 1);
      expect(result.knockoutSize).toBe(4);
      expect(result.bestNextPlacedCount).toBe(1);
    });
  });

  describe("power of 2 rounding", () => {
    it("2 groups, 1 advancing → knockout 2, 0 best-next", () => {
      const result = calculateBracketFill(2, 1);
      expect(result.knockoutSize).toBe(2);
      expect(result.bestNextPlacedCount).toBe(0);
    });

    it("2 groups, 2 advancing → knockout 4, 0 best-next", () => {
      const result = calculateBracketFill(2, 2);
      expect(result.knockoutSize).toBe(4);
      expect(result.bestNextPlacedCount).toBe(0);
    });

    it("8 groups, 3 advancing → knockout 32, 8 best-next", () => {
      const result = calculateBracketFill(8, 3);
      // 8*3 = 24 direct qualifiers, next power of 2 = 32
      // bestNext = 32 - 24 = 8
      // 8 <= 8 groups, so no bump needed
      expect(result.knockoutSize).toBe(32);
      expect(result.bestNextPlacedCount).toBe(8);
    });

    it("6 groups, 2 advancing → knockout 16, 4 best-next", () => {
      const result = calculateBracketFill(6, 2);
      // 6*2 = 12 direct, next power of 2 = 16
      // bestNext = 16 - 12 = 4
      // 4 <= 6 groups, ok
      expect(result.knockoutSize).toBe(16);
      expect(result.bestNextPlacedCount).toBe(4);
    });
  });

  describe("bump to next power of 2 when bestNext exceeds groupCount", () => {
    it("5 groups, 2 advancing → knockout 16, bestNext capped at 5", () => {
      const result = calculateBracketFill(5, 2);
      // 10 direct, pow2=16, need 6 but only 5 groups available → cap at 5
      expect(result.knockoutSize).toBe(16);
      expect(result.bestNextPlacedCount).toBe(5);
    });

    it("3 groups, 2 advancing: bestNext fits within groupCount", () => {
      const result = calculateBracketFill(3, 2);
      expect(result.bestNextPlacedCount).toBeLessThanOrEqual(3);
    });
  });

  describe("exact bracket sizing", () => {
    it("when direct qualifiers is already a power of 2, bestNext is 0", () => {
      // 4 groups, 2 advancing = 8 = 2^3
      const result = calculateBracketFill(4, 2);
      expect(result.knockoutSize).toBe(8);
      expect(result.bestNextPlacedCount).toBe(0);

      // 8 groups, 2 advancing = 16 = 2^4
      const result2 = calculateBracketFill(8, 2);
      expect(result2.knockoutSize).toBe(16);
      expect(result2.bestNextPlacedCount).toBe(0);
    });

    it("direct qualifiers just above a power of 2", () => {
      // 5 groups, 1 advancing = 5 direct. Pow2 = 8. bestNext = 3.
      const result = calculateBracketFill(5, 1);
      expect(result.knockoutSize).toBe(8);
      expect(result.bestNextPlacedCount).toBe(3);
    });

    it("large scenario: 8 groups, 1 advancing = 8 direct → knockout 8, 0 best-next", () => {
      const result = calculateBracketFill(8, 1);
      expect(result.knockoutSize).toBe(8);
      expect(result.bestNextPlacedCount).toBe(0);
    });

    it("7 groups, 2 advancing = 14 direct → knockout 16, 2 best-next", () => {
      const result = calculateBracketFill(7, 2);
      expect(result.knockoutSize).toBe(16);
      expect(result.bestNextPlacedCount).toBe(2);
    });

    it("6 groups, 1 advancing = 6 direct → knockout 8, 2 best-next", () => {
      const result = calculateBracketFill(6, 1);
      expect(result.knockoutSize).toBe(8);
      expect(result.bestNextPlacedCount).toBe(2);
    });
  });

  describe("edge cases", () => {
    it("bestNextPlacedCount is always >= 0", () => {
      for (let groups = 2; groups <= 8; groups++) {
        for (let adv = 1; adv <= 3; adv++) {
          const result = calculateBracketFill(groups, adv);
          expect(result.bestNextPlacedCount).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it("knockoutSize is always a power of 2", () => {
      for (let groups = 2; groups <= 8; groups++) {
        for (let adv = 1; adv <= 3; adv++) {
          const result = calculateBracketFill(groups, adv);
          expect(result.knockoutSize & (result.knockoutSize - 1)).toBe(0);
          expect(result.knockoutSize).toBeGreaterThan(0);
        }
      }
    });

    it("knockoutSize >= direct qualifiers", () => {
      for (let groups = 2; groups <= 8; groups++) {
        for (let adv = 1; adv <= 3; adv++) {
          const result = calculateBracketFill(groups, adv);
          expect(result.knockoutSize).toBeGreaterThanOrEqual(groups * adv);
        }
      }
    });

    it("bestNextPlacedCount never exceeds groupCount", () => {
      for (let groups = 2; groups <= 8; groups++) {
        for (let adv = 1; adv <= 3; adv++) {
          const result = calculateBracketFill(groups, adv);
          expect(result.bestNextPlacedCount).toBeLessThanOrEqual(groups);
        }
      }
    });

    it("total qualifiers (direct + bestNext) <= knockoutSize", () => {
      for (let groups = 2; groups <= 8; groups++) {
        for (let adv = 1; adv <= 3; adv++) {
          const result = calculateBracketFill(groups, adv);
          const total = groups * adv + result.bestNextPlacedCount;
          expect(total).toBeLessThanOrEqual(result.knockoutSize);
        }
      }
    });
  });
});

describe("maxAdvancingPerGroup", () => {
  it("returns smallest group size minus 1", () => {
    expect(maxAdvancingPerGroup([4, 3, 3])).toBe(2);
    expect(maxAdvancingPerGroup([5, 5])).toBe(4);
    expect(maxAdvancingPerGroup([3, 3, 3])).toBe(2);
    expect(maxAdvancingPerGroup([4, 4, 4, 4])).toBe(3);
    expect(maxAdvancingPerGroup([5, 4, 4])).toBe(3);
  });

  it("returns at least 1 for any valid group", () => {
    expect(maxAdvancingPerGroup([3])).toBe(2);
    expect(maxAdvancingPerGroup([3, 3])).toBe(2);
  });

  it("returns 0 for empty sizes", () => {
    expect(maxAdvancingPerGroup([])).toBe(0);
  });

  it("10 teams, 3 groups (1x4 + 2x3): max advancing is 2, not 3", () => {
    const options = getGroupOptions(10);
    const mixed = options.find((o) => o.groupCount === 3)!;
    expect(mixed.sizes).toEqual([4, 3, 3]);
    expect(maxAdvancingPerGroup(mixed.sizes)).toBe(2);
  });
});

describe("getAdvancingOptions", () => {
  it("returns [2, 4] for a single group of 4", () => {
    expect(getAdvancingOptions(1, [4])).toEqual([2, 4]);
  });

  it("returns [2, 4] for a single group of 5", () => {
    expect(getAdvancingOptions(1, [5])).toEqual([2, 4]);
  });

  it("returns [1, 2] for two groups of 3 (multi-group, top-1..top-max)", () => {
    expect(getAdvancingOptions(2, [3, 3])).toEqual([1, 2]);
  });

  it("returns [1, 2, 3] for three groups of 4", () => {
    expect(getAdvancingOptions(3, [4, 4, 4])).toEqual([1, 2, 3]);
  });

  it("returns [1, 2, 3, 4] for four groups of 5", () => {
    expect(getAdvancingOptions(4, [5, 5, 5, 5])).toEqual([1, 2, 3, 4]);
  });

  it("returns [] for empty sizes", () => {
    expect(getAdvancingOptions(0, [])).toEqual([]);
  });
});

describe("qualifying count never exceeds team count", () => {
  it("for all team counts 4-24, no valid config produces more qualifiers than teams", () => {
    for (let teamCount = 4; teamCount <= 24; teamCount++) {
      const options = getGroupOptions(teamCount);
      for (const opt of options) {
        const maxAdv = maxAdvancingPerGroup(opt.sizes);
        for (let adv = 1; adv <= maxAdv; adv++) {
          const fill = calculateBracketFill(opt.groupCount, adv);
          const totalQualifying =
            opt.groupCount * adv + fill.bestNextPlacedCount;
          expect(totalQualifying).toBeLessThanOrEqual(teamCount);
        }
      }
    }
  });

  it("10 teams, 3 groups (1x4 + 2x3), Top 2: qualifying fits", () => {
    const fill = calculateBracketFill(3, 2);
    const totalQualifying = 3 * 2 + fill.bestNextPlacedCount;
    expect(totalQualifying).toBeLessThanOrEqual(10);
  });
});
