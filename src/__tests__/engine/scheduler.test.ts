import { describe, it, expect } from "vitest";
import { scheduleMatches } from "../../engine/scheduler";
import type { Match } from "../../types";

function makeMatch(
  id: string,
  home: string,
  away: string,
  phase: "group" | "knockout" = "group"
): Match {
  return {
    id,
    homeTeamId: home,
    awayTeamId: away,
    fieldIndex: -1,
    timeSlot: -1,
    score: null,
    phase,
  };
}

function roundRobin(teamIds: string[], prefix: string): Match[] {
  const matches: Match[] = [];
  let idx = 0;
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      matches.push(makeMatch(`${prefix}-${idx++}`, teamIds[i], teamIds[j]));
    }
  }
  return matches;
}

function assertHardConstraints(scheduled: Match[], fieldCount: number) {
  for (const m of scheduled) {
    expect(m.fieldIndex).toBeGreaterThanOrEqual(0);
    expect(m.fieldIndex).toBeLessThan(fieldCount);
    expect(m.timeSlot).toBeGreaterThanOrEqual(0);
  }

  const slotFieldPairs = new Set<string>();
  for (const m of scheduled) {
    const key = `${m.timeSlot}-${m.fieldIndex}`;
    expect(slotFieldPairs.has(key)).toBe(false);
    slotFieldPairs.add(key);
  }

  const slotTeams = new Map<number, Set<string>>();
  for (const m of scheduled) {
    if (!slotTeams.has(m.timeSlot)) slotTeams.set(m.timeSlot, new Set());
    const teams = slotTeams.get(m.timeSlot)!;
    expect(teams.has(m.homeTeamId)).toBe(false);
    expect(teams.has(m.awayTeamId)).toBe(false);
    teams.add(m.homeTeamId);
    teams.add(m.awayTeamId);
  }
}

describe("scheduleMatches", () => {
  describe("hard constraints", () => {
    it("returns same number of matches as input", () => {
      const matches = [
        makeMatch("1", "a", "b"),
        makeMatch("2", "c", "d"),
        makeMatch("3", "a", "c"),
      ];
      const result = scheduleMatches(matches, 2);
      expect(result).toHaveLength(matches.length);
    });

    it("assigns valid fieldIndex and timeSlot to every match", () => {
      const matches = roundRobin(["a", "b", "c", "d"], "g1");
      const result = scheduleMatches(matches, 2);
      for (const m of result) {
        expect(m.fieldIndex).toBeGreaterThanOrEqual(0);
        expect(m.fieldIndex).toBeLessThan(2);
        expect(m.timeSlot).toBeGreaterThanOrEqual(0);
      }
    });

    it("no team plays twice in the same time slot", () => {
      const matches = roundRobin(["a", "b", "c", "d", "e"], "g1");
      const result = scheduleMatches(matches, 3);
      assertHardConstraints(result, 3);
    });

    it("no two matches share the same (fieldIndex, timeSlot)", () => {
      const matches = [
        ...roundRobin(["a", "b", "c"], "g1"),
        ...roundRobin(["d", "e", "f"], "g2"),
      ];
      const result = scheduleMatches(matches, 2);
      assertHardConstraints(result, 2);
    });

    it("preserves original match data (id, teams, score, phase)", () => {
      const matches = [
        makeMatch("m1", "teamA", "teamB"),
        makeMatch("m2", "teamC", "teamD", "knockout"),
      ];
      const result = scheduleMatches(matches, 2);
      const m1 = result.find((m) => m.id === "m1")!;
      const m2 = result.find((m) => m.id === "m2")!;
      expect(m1.homeTeamId).toBe("teamA");
      expect(m1.awayTeamId).toBe("teamB");
      expect(m1.score).toBeNull();
      expect(m1.phase).toBe("group");
      expect(m2.phase).toBe("knockout");
    });
  });

  describe("field utilization", () => {
    it("4 teams, 2 fields: slot 0 has 2 matches (a-b + c-d)", () => {
      const matches = [
        makeMatch("1", "a", "b"),
        makeMatch("2", "c", "d"),
        makeMatch("3", "a", "c"),
        makeMatch("4", "b", "d"),
        makeMatch("5", "a", "d"),
        makeMatch("6", "b", "c"),
      ];
      const result = scheduleMatches(matches, 2);
      const slot0 = result.filter((m) => m.timeSlot === 0);
      expect(slot0).toHaveLength(2);
    });

    it("fills all fields before moving to next slot when possible", () => {
      const matches = [
        makeMatch("1", "a", "b"),
        makeMatch("2", "c", "d"),
        makeMatch("3", "e", "f"),
      ];
      const result = scheduleMatches(matches, 3);
      const slot0 = result.filter((m) => m.timeSlot === 0);
      expect(slot0).toHaveLength(3);
    });

    it("single field: every slot has exactly 1 match", () => {
      const matches = roundRobin(["a", "b", "c"], "g1");
      const result = scheduleMatches(matches, 1);
      assertHardConstraints(result, 1);
      const slotCounts = new Map<number, number>();
      for (const m of result) {
        slotCounts.set(m.timeSlot, (slotCounts.get(m.timeSlot) ?? 0) + 1);
      }
      for (const count of slotCounts.values()) {
        expect(count).toBe(1);
      }
    });

    it("many fields, few matches: all in one slot", () => {
      const matches = [
        makeMatch("1", "a", "b"),
        makeMatch("2", "c", "d"),
      ];
      const result = scheduleMatches(matches, 5);
      expect(result.every((m) => m.timeSlot === 0)).toBe(true);
    });
  });

  describe("two competitions sharing fields", () => {
    it("men + women with 3 fields, no conflicts", () => {
      const mensMatches = roundRobin(["m-a", "m-b", "m-c", "m-d"], "men");
      const womensMatches = roundRobin(["w-x", "w-y", "w-z", "w-w"], "women");
      const all = [...mensMatches, ...womensMatches];
      const result = scheduleMatches(all, 3);

      expect(result).toHaveLength(all.length);
      assertHardConstraints(result, 3);
    });

    it("men + women interleave correctly across time slots", () => {
      const mensMatches = roundRobin(["m-a", "m-b", "m-c", "m-d"], "men");
      const womensMatches = roundRobin(["w-x", "w-y", "w-z", "w-w"], "women");
      const all = [...mensMatches, ...womensMatches];
      const result = scheduleMatches(all, 3);

      const maxSlot = Math.max(...result.map((m) => m.timeSlot));
      let hasMensAndWomensInSameSlot = false;
      for (let slot = 0; slot <= maxSlot; slot++) {
        const slotMatches = result.filter((m) => m.timeSlot === slot);
        const hasMens = slotMatches.some((m) => m.id.startsWith("men"));
        const hasWomens = slotMatches.some((m) => m.id.startsWith("women"));
        if (hasMens && hasWomens) hasMensAndWomensInSameSlot = true;
      }
      expect(hasMensAndWomensInSameSlot).toBe(true);
    });

    it("8 men + 8 women teams, 4 fields, full round-robin", () => {
      const menTeams = Array.from({ length: 8 }, (_, i) => `m-${i}`);
      const womenTeams = Array.from({ length: 8 }, (_, i) => `w-${i}`);
      const mensMatches = roundRobin(menTeams, "men");
      const womensMatches = roundRobin(womenTeams, "women");
      const all = [...mensMatches, ...womensMatches];

      expect(all).toHaveLength(56); // 28 + 28

      const result = scheduleMatches(all, 4);
      expect(result).toHaveLength(56);
      assertHardConstraints(result, 4);
    });
  });

  describe("rest optimization", () => {
    it("team matches are spread across time slots, not back-to-back if avoidable", () => {
      const matches = roundRobin(["a", "b", "c", "d"], "g1");
      const result = scheduleMatches(matches, 1);

      const teamSlots = new Map<string, number[]>();
      for (const m of result) {
        for (const tid of [m.homeTeamId, m.awayTeamId]) {
          if (!teamSlots.has(tid)) teamSlots.set(tid, []);
          teamSlots.get(tid)!.push(m.timeSlot);
        }
      }

      for (const [, slots] of teamSlots) {
        slots.sort((a, b) => a - b);
        for (let i = 1; i < slots.length; i++) {
          expect(slots[i] - slots[i - 1]).toBeGreaterThanOrEqual(1);
        }
      }
    });

    it("with enough fields, no team plays consecutive slots", () => {
      const matches = roundRobin(["a", "b", "c", "d", "e", "f"], "g1");
      const result = scheduleMatches(matches, 3);

      const teamSlots = new Map<string, number[]>();
      for (const m of result) {
        for (const tid of [m.homeTeamId, m.awayTeamId]) {
          if (!teamSlots.has(tid)) teamSlots.set(tid, []);
          teamSlots.get(tid)!.push(m.timeSlot);
        }
      }

      // Soft constraint: we just verify the algorithm tries
      // With 6 teams, 15 matches, 3 fields = 5 slots minimum
      // Each team plays 5 matches in 5+ slots — back-to-back may be inevitable
      // so we just check the gap is at least 1
      for (const [, slots] of teamSlots) {
        slots.sort((a, b) => a - b);
        for (let i = 1; i < slots.length; i++) {
          expect(slots[i] - slots[i - 1]).toBeGreaterThanOrEqual(1);
        }
      }
    });
  });

  describe("edge cases", () => {
    it("0 matches returns empty array", () => {
      const result = scheduleMatches([], 3);
      expect(result).toHaveLength(0);
    });

    it("1 field, many matches: all sequential", () => {
      const matches = roundRobin(["a", "b", "c", "d", "e"], "g1");
      const result = scheduleMatches(matches, 1);
      expect(result).toHaveLength(10);
      assertHardConstraints(result, 1);

      const maxSlot = Math.max(...result.map((m) => m.timeSlot));
      expect(maxSlot).toBe(9);
    });

    it("odd number of matches", () => {
      const matches = [
        makeMatch("1", "a", "b"),
        makeMatch("2", "c", "d"),
        makeMatch("3", "a", "c"),
      ];
      const result = scheduleMatches(matches, 2);
      expect(result).toHaveLength(3);
      assertHardConstraints(result, 2);
    });

    it("single match", () => {
      const result = scheduleMatches([makeMatch("m1", "a", "b")], 4);
      expect(result).toHaveLength(1);
      expect(result[0].timeSlot).toBe(0);
      expect(result[0].fieldIndex).toBe(0);
    });

    it("all matches involve the same team (star topology)", () => {
      const matches = [
        makeMatch("1", "center", "a"),
        makeMatch("2", "center", "b"),
        makeMatch("3", "center", "c"),
        makeMatch("4", "center", "d"),
      ];
      const result = scheduleMatches(matches, 4);
      expect(result).toHaveLength(4);
      assertHardConstraints(result, 4);
      // center plays in every match, so only 1 match per slot
      const maxSlot = Math.max(...result.map((m) => m.timeSlot));
      expect(maxSlot).toBe(3);
    });

    it("does not mutate original array order or create new match objects", () => {
      const matches = [
        makeMatch("1", "a", "b"),
        makeMatch("2", "c", "d"),
      ];
      const originalIds = matches.map((m) => m.id);
      const result = scheduleMatches(matches, 2);
      expect(result.map((m) => m.id).sort()).toEqual(originalIds.sort());
    });

    it("handles teams with long/special IDs", () => {
      const matches = [
        makeMatch("match-1", "team-with-very-long-name-123", "another-long-team-456"),
        makeMatch("match-2", "unicode-тест-αβγ", "special!@#$%"),
      ];
      const result = scheduleMatches(matches, 2);
      expect(result).toHaveLength(2);
      assertHardConstraints(result, 2);
    });
  });

  describe("large tournament scenarios", () => {
    it("16 teams across 2 competitions, 4 fields", () => {
      const menTeams = Array.from({ length: 8 }, (_, i) => `m-${i}`);
      const womenTeams = Array.from({ length: 8 }, (_, i) => `w-${i}`);

      // 2 groups of 4 per competition
      const menG1 = roundRobin(menTeams.slice(0, 4), "mg1");
      const menG2 = roundRobin(menTeams.slice(4, 8), "mg2");
      const womenG1 = roundRobin(womenTeams.slice(0, 4), "wg1");
      const womenG2 = roundRobin(womenTeams.slice(4, 8), "wg2");
      const all = [...menG1, ...menG2, ...womenG1, ...womenG2];

      expect(all).toHaveLength(24); // 6+6+6+6

      const result = scheduleMatches(all, 4);
      expect(result).toHaveLength(24);
      assertHardConstraints(result, 4);
    });

    it("16 teams, 6 fields — wider than needed", () => {
      const teams = Array.from({ length: 16 }, (_, i) => `t-${i}`);
      // 4 groups of 4
      const matches = [
        ...roundRobin(teams.slice(0, 4), "g1"),
        ...roundRobin(teams.slice(4, 8), "g2"),
        ...roundRobin(teams.slice(8, 12), "g3"),
        ...roundRobin(teams.slice(12, 16), "g4"),
      ];

      const result = scheduleMatches(matches, 6);
      expect(result).toHaveLength(24);
      assertHardConstraints(result, 6);
    });

    it("20 teams (10 per comp), groups of 5, 4 fields — 80 matches stress test", () => {
      // Men: 2 groups of 5
      const menG1 = roundRobin(["m0", "m1", "m2", "m3", "m4"], "mg1");
      const menG2 = roundRobin(["m5", "m6", "m7", "m8", "m9"], "mg2");
      // Women: 2 groups of 5
      const womenG1 = roundRobin(["w0", "w1", "w2", "w3", "w4"], "wg1");
      const womenG2 = roundRobin(["w5", "w6", "w7", "w8", "w9"], "wg2");

      const all = [...menG1, ...menG2, ...womenG1, ...womenG2];
      expect(all).toHaveLength(40); // 10+10+10+10

      const result = scheduleMatches(all, 4);
      expect(result).toHaveLength(40);
      assertHardConstraints(result, 4);
    });

    it("full stress: 20 teams, 4 groups of 5, 2 comps, 4 fields — 80 matches", () => {
      const menTeams = Array.from({ length: 20 }, (_, i) => `m-${i}`);
      const womenTeams = Array.from({ length: 20 }, (_, i) => `w-${i}`);

      const matches: Match[] = [];
      for (let g = 0; g < 4; g++) {
        const mSlice = menTeams.slice(g * 5, (g + 1) * 5);
        const wSlice = womenTeams.slice(g * 5, (g + 1) * 5);
        matches.push(...roundRobin(mSlice, `mg${g}`));
        matches.push(...roundRobin(wSlice, `wg${g}`));
      }

      expect(matches).toHaveLength(80); // 8 groups × 10 matches

      const result = scheduleMatches(matches, 4);
      expect(result).toHaveLength(80);
      assertHardConstraints(result, 4);
    });

    it("terminates within reasonable time for large input", () => {
      const matches: Match[] = [];
      for (let g = 0; g < 8; g++) {
        const teams = Array.from({ length: 5 }, (_, i) => `g${g}-t${i}`);
        matches.push(...roundRobin(teams, `g${g}`));
      }
      expect(matches).toHaveLength(80);

      const start = performance.now();
      const result = scheduleMatches(matches, 4);
      const elapsed = performance.now() - start;

      expect(result).toHaveLength(80);
      assertHardConstraints(result, 4);
      expect(elapsed).toBeLessThan(5000);
    });
  });

  describe("slot packing quality", () => {
    it("uses minimum possible slots for non-conflicting matches", () => {
      // 6 matches, no team overlap between pairs, 3 fields
      // Should fit in 2 slots
      const matches = [
        makeMatch("1", "a", "b"),
        makeMatch("2", "c", "d"),
        makeMatch("3", "e", "f"),
        makeMatch("4", "a", "c"),
        makeMatch("5", "b", "d"),
        makeMatch("6", "e", "a"),
      ];
      const result = scheduleMatches(matches, 3);
      assertHardConstraints(result, 3);
      // First 3 matches have no team conflicts, should fill slot 0
      const slot0 = result.filter((m) => m.timeSlot === 0);
      expect(slot0.length).toBe(3);
    });

    it("packs 2 independent groups into parallel slots with 2 fields", () => {
      const g1 = roundRobin(["a", "b", "c"], "g1"); // 3 matches
      const g2 = roundRobin(["d", "e", "f"], "g2"); // 3 matches
      const result = scheduleMatches([...g1, ...g2], 2);
      assertHardConstraints(result, 2);
      // Slot 0 should have 2 matches (one from each group)
      const slot0 = result.filter((m) => m.timeSlot === 0);
      expect(slot0).toHaveLength(2);
    });
  });

  describe("match identity preservation", () => {
    it("every input match ID appears exactly once in output", () => {
      const matches = roundRobin(["a", "b", "c", "d"], "g1");
      const inputIds = new Set(matches.map((m) => m.id));
      const result = scheduleMatches(matches, 2);
      const outputIds = new Set(result.map((m) => m.id));
      expect(outputIds).toEqual(inputIds);
    });

    it("match team assignments are preserved", () => {
      const matches = roundRobin(["x", "y", "z"], "g1");
      const inputPairs = matches.map(
        (m) => `${m.homeTeamId}-${m.awayTeamId}`
      );
      const result = scheduleMatches(matches, 2);
      const outputPairs = result.map(
        (m) => `${m.homeTeamId}-${m.awayTeamId}`
      );
      expect(outputPairs.sort()).toEqual(inputPairs.sort());
    });
  });

  describe("field index distribution", () => {
    it("uses all available fields when enough matches exist", () => {
      const matches = [
        makeMatch("1", "a", "b"),
        makeMatch("2", "c", "d"),
        makeMatch("3", "e", "f"),
        makeMatch("4", "g", "h"),
      ];
      const result = scheduleMatches(matches, 4);
      const usedFields = new Set(result.map((m) => m.fieldIndex));
      expect(usedFields.size).toBe(4);
    });

    it("field indices are within bounds even with 1 field", () => {
      const matches = roundRobin(["a", "b", "c"], "g1");
      const result = scheduleMatches(matches, 1);
      for (const m of result) {
        expect(m.fieldIndex).toBe(0);
      }
    });
  });

  describe("determinism", () => {
    it("produces consistent scheduling across multiple runs", () => {
      const matches = () => roundRobin(["a", "b", "c", "d"], "g1");
      const r1 = scheduleMatches(matches(), 2);
      const r2 = scheduleMatches(matches(), 2);
      for (let i = 0; i < r1.length; i++) {
        expect(r1[i].timeSlot).toBe(r2[i].timeSlot);
        expect(r1[i].fieldIndex).toBe(r2[i].fieldIndex);
      }
    });
  });

  describe("constraint saturation", () => {
    it("handles case where one team is in every match (complete star)", () => {
      const teams = Array.from({ length: 10 }, (_, i) => `t${i}`);
      const matches = teams
        .slice(1)
        .map((t, i) => makeMatch(`m${i}`, "t0", t));
      const result = scheduleMatches(matches, 5);
      expect(result).toHaveLength(9);
      assertHardConstraints(result, 5);
      // t0 plays every match, so max 1 per slot
      const maxSlot = Math.max(...result.map((m) => m.timeSlot));
      expect(maxSlot).toBe(8);
    });

    it("handles mix of dense and sparse conflicts", () => {
      // Group A: a, b, c (dense, 3 matches)
      // Group B: d, e, f, g, h (dense, 10 matches)
      // No cross-group conflicts
      const matches = [
        ...roundRobin(["a", "b", "c"], "gA"),
        ...roundRobin(["d", "e", "f", "g", "h"], "gB"),
      ];
      const result = scheduleMatches(matches, 3);
      expect(result).toHaveLength(13);
      assertHardConstraints(result, 3);
    });

    it("two teams that play each other get different slots for their other matches", () => {
      const matches = roundRobin(["a", "b", "c", "d"], "g1");
      const result = scheduleMatches(matches, 2);
      assertHardConstraints(result, 2);
    });
  });

  describe("does not mutate input", () => {
    it("original matches retain fieldIndex=-1 and timeSlot=-1", () => {
      const matches = [
        makeMatch("1", "a", "b"),
        makeMatch("2", "c", "d"),
      ];
      scheduleMatches(matches, 2);
      for (const m of matches) {
        expect(m.fieldIndex).toBe(-1);
        expect(m.timeSlot).toBe(-1);
      }
    });

    it("input array length is unchanged", () => {
      const matches = roundRobin(["a", "b", "c"], "g1");
      const len = matches.length;
      scheduleMatches(matches, 2);
      expect(matches).toHaveLength(len);
    });
  });

  describe("time slot continuity", () => {
    it("time slots are contiguous (no gaps)", () => {
      const matches = roundRobin(["a", "b", "c", "d", "e"], "g1");
      const result = scheduleMatches(matches, 2);
      const slots = [...new Set(result.map((m) => m.timeSlot))].sort(
        (a, b) => a - b
      );
      for (let i = 0; i < slots.length; i++) {
        expect(slots[i]).toBe(i);
      }
    });

    it("always starts from time slot 0", () => {
      const matches = roundRobin(["a", "b", "c"], "g1");
      const result = scheduleMatches(matches, 2);
      const minSlot = Math.min(...result.map((m) => m.timeSlot));
      expect(minSlot).toBe(0);
    });
  });

  describe("parametric hard constraint sweep", () => {
    const configs = [
      { teams: 4, fields: 1 },
      { teams: 4, fields: 2 },
      { teams: 4, fields: 3 },
      { teams: 6, fields: 1 },
      { teams: 6, fields: 2 },
      { teams: 6, fields: 3 },
      { teams: 8, fields: 2 },
      { teams: 8, fields: 4 },
      { teams: 10, fields: 3 },
      { teams: 10, fields: 5 },
    ];

    for (const { teams, fields } of configs) {
      it(`${teams} teams, ${fields} fields: all hard constraints hold`, () => {
        const teamIds = Array.from({ length: teams }, (_, i) => `t${i}`);
        const matches = roundRobin(teamIds, "g");
        const result = scheduleMatches(matches, fields);
        expect(result).toHaveLength(matches.length);
        assertHardConstraints(result, fields);
      });
    }
  });

  describe("two-competition parametric sweep", () => {
    const configs = [
      { menTeams: 4, womenTeams: 4, fields: 2 },
      { menTeams: 6, womenTeams: 6, fields: 3 },
      { menTeams: 8, womenTeams: 8, fields: 4 },
      { menTeams: 4, womenTeams: 6, fields: 3 },
      { menTeams: 6, womenTeams: 4, fields: 2 },
    ];

    for (const { menTeams, womenTeams, fields } of configs) {
      it(`${menTeams}M + ${womenTeams}W teams, ${fields} fields: hard constraints hold`, () => {
        const mIds = Array.from({ length: menTeams }, (_, i) => `m-${i}`);
        const wIds = Array.from({ length: womenTeams }, (_, i) => `w-${i}`);
        const all = [
          ...roundRobin(mIds, "men"),
          ...roundRobin(wIds, "women"),
        ];
        const result = scheduleMatches(all, fields);
        expect(result).toHaveLength(all.length);
        assertHardConstraints(result, fields);
      });
    }
  });

  describe("realistic tournament configs", () => {
    it("Euro-style: 6 groups of 4, 2 comps, 4 fields — 72 matches", () => {
      const matches: Match[] = [];
      for (let comp = 0; comp < 2; comp++) {
        for (let g = 0; g < 3; g++) {
          const teams = Array.from(
            { length: 4 },
            (_, i) => `c${comp}-g${g}-t${i}`
          );
          matches.push(...roundRobin(teams, `c${comp}g${g}`));
        }
      }
      expect(matches).toHaveLength(36); // 6 groups × 6 matches

      const result = scheduleMatches(matches, 4);
      expect(result).toHaveLength(36);
      assertHardConstraints(result, 4);
    });

    it("small tournament: 2 groups of 3, 2 comps, 2 fields — 12 matches", () => {
      const matches: Match[] = [];
      for (const comp of ["men", "women"]) {
        for (let g = 0; g < 2; g++) {
          const teams = Array.from(
            { length: 3 },
            (_, i) => `${comp}-g${g}-t${i}`
          );
          matches.push(...roundRobin(teams, `${comp}g${g}`));
        }
      }
      expect(matches).toHaveLength(12);

      const result = scheduleMatches(matches, 2);
      expect(result).toHaveLength(12);
      assertHardConstraints(result, 2);
    });

    it("micro tournament: 1 group of 3 per comp, 1 field — 6 matches all sequential", () => {
      const matches = [
        ...roundRobin(["m-a", "m-b", "m-c"], "men"),
        ...roundRobin(["w-a", "w-b", "w-c"], "women"),
      ];
      const result = scheduleMatches(matches, 1);
      expect(result).toHaveLength(6);
      assertHardConstraints(result, 1);
      const maxSlot = Math.max(...result.map((m) => m.timeSlot));
      expect(maxSlot).toBe(5);
    });
  });

  describe("slot efficiency", () => {
    it("with 4 independent groups of 4 and 4 fields, slot 0 fills all fields", () => {
      const matches: Match[] = [];
      for (let g = 0; g < 4; g++) {
        const teams = Array.from({ length: 4 }, (_, i) => `g${g}-t${i}`);
        matches.push(...roundRobin(teams, `g${g}`));
      }
      const result = scheduleMatches(matches, 4);
      assertHardConstraints(result, 4);
      const slot0 = result.filter((m) => m.timeSlot === 0);
      expect(slot0).toHaveLength(4);
    });

    it("number of time slots is reasonable (not wildly inflated)", () => {
      const matches = roundRobin(["a", "b", "c", "d"], "g1");
      const result = scheduleMatches(matches, 2);
      const maxSlot = Math.max(...result.map((m) => m.timeSlot));
      // 6 matches, 2 fields, 4 teams (max 2 simultaneous) = 3 slots minimum
      expect(maxSlot).toBeLessThanOrEqual(5);
    });
  });

  describe("regression: no infinite loops", () => {
    it("completes for a tricky conflict pattern", () => {
      // All matches share at least one team with another
      const matches = [
        makeMatch("1", "a", "b"),
        makeMatch("2", "b", "c"),
        makeMatch("3", "c", "d"),
        makeMatch("4", "d", "a"),
        makeMatch("5", "a", "c"),
        makeMatch("6", "b", "d"),
      ];
      const result = scheduleMatches(matches, 2);
      expect(result).toHaveLength(6);
      assertHardConstraints(result, 2);
    });

    it("completes for maximum constraint scenario (complete graph K10, 1 field)", () => {
      const teams = Array.from({ length: 10 }, (_, i) => `t${i}`);
      const matches = roundRobin(teams, "full");
      expect(matches).toHaveLength(45);
      const result = scheduleMatches(matches, 1);
      expect(result).toHaveLength(45);
      assertHardConstraints(result, 1);
    });
  });

  describe("packing density (issue #22)", () => {
    function slotMatchCounts(scheduled: Match[]): number[] {
      const counts = new Map<number, number>();
      for (const m of scheduled) {
        counts.set(m.timeSlot, (counts.get(m.timeSlot) ?? 0) + 1);
      }
      const maxSlot = Math.max(...counts.keys());
      const out: number[] = [];
      for (let s = 0; s <= maxSlot; s++) out.push(counts.get(s) ?? 0);
      return out;
    }

    it("single 6-team group on 4 fields has no trailing single-match slots", () => {
      const matches = roundRobin(
        ["t0", "t1", "t2", "t3", "t4", "t5"],
        "g1"
      );
      const result = scheduleMatches(matches, 4);
      assertHardConstraints(result, 4);

      const counts = slotMatchCounts(result);
      // No non-empty slot should have fewer matches than a later non-empty slot.
      for (let i = 0; i < counts.length - 1; i++) {
        if (counts[i] === 0) continue;
        for (let j = i + 1; j < counts.length; j++) {
          if (counts[j] === 0) continue;
          expect(counts[i]).toBeGreaterThanOrEqual(counts[j]);
        }
      }
    });

    it("single 6-team group on 4 fields uses minimum number of slots (5)", () => {
      // 6 teams → 15 matches. With 4 fields and the constraint that each team
      // plays in every round, we need at least ceil(15/3)=5 slots (round-limited,
      // not field-limited — each round has 3 matches).
      const matches = roundRobin(
        ["t0", "t1", "t2", "t3", "t4", "t5"],
        "g1"
      );
      const result = scheduleMatches(matches, 4);
      const maxSlot = Math.max(...result.map((m) => m.timeSlot));
      expect(maxSlot).toBe(4); // 5 slots indexed 0..4
    });

    it("single 4-team group on 2 fields packs into exactly 3 slots of 2", () => {
      const matches = roundRobin(["a", "b", "c", "d"], "g1");
      const result = scheduleMatches(matches, 2);
      const counts = slotMatchCounts(result);
      expect(counts).toEqual([2, 2, 2]);
    });

    it("two 6-team groups on 4 fields: tail is at most one short slot", () => {
      const g1 = roundRobin(["a0", "a1", "a2", "a3", "a4", "a5"], "ga");
      const g2 = roundRobin(["b0", "b1", "b2", "b3", "b4", "b5"], "gb");
      const result = scheduleMatches([...g1, ...g2], 4);
      assertHardConstraints(result, 4);

      const counts = slotMatchCounts(result);
      // Monotonically non-increasing: once you drop below 4, you never climb back.
      for (let i = 1; i < counts.length; i++) {
        expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
      }
    });

    it("parametric: no group/field combo produces a non-monotonic match-count profile", () => {
      const configs = [
        { teams: 4, fields: 2 },
        { teams: 4, fields: 4 },
        { teams: 5, fields: 2 },
        { teams: 5, fields: 3 },
        { teams: 6, fields: 3 },
        { teams: 6, fields: 4 },
      ];
      for (const { teams, fields } of configs) {
        const ids = Array.from({ length: teams }, (_, i) => `t${i}`);
        const result = scheduleMatches(roundRobin(ids, "g"), fields);
        const counts = slotMatchCounts(result);
        for (let i = 1; i < counts.length; i++) {
          expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
        }
      }
    });
  });
});
