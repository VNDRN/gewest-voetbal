import { describe, it, expect } from "vitest";
import { circleMethodRounds } from "../../engine/roundRobin";

describe("circleMethodRounds", () => {
  describe("structural properties", () => {
    it("returns empty for 0 or 1 teams", () => {
      expect(circleMethodRounds(0)).toEqual([]);
      expect(circleMethodRounds(1)).toEqual([]);
    });

    it("2 teams: 1 round, 1 pair", () => {
      const rounds = circleMethodRounds(2);
      expect(rounds).toHaveLength(1);
      expect(rounds[0]).toEqual([[0, 1]]);
    });

    it("4 teams: 3 rounds, 2 pairs each", () => {
      const rounds = circleMethodRounds(4);
      expect(rounds).toHaveLength(3);
      for (const round of rounds) {
        expect(round).toHaveLength(2);
      }
    });

    it("6 teams: 5 rounds, 3 pairs each", () => {
      const rounds = circleMethodRounds(6);
      expect(rounds).toHaveLength(5);
      for (const round of rounds) {
        expect(round).toHaveLength(3);
      }
    });

    it("odd n=5: 5 rounds, 2 pairs each (one team byes per round)", () => {
      const rounds = circleMethodRounds(5);
      expect(rounds).toHaveLength(5);
      for (const round of rounds) {
        expect(round).toHaveLength(2);
      }
    });

    it("odd n=7: 7 rounds, 3 pairs each", () => {
      const rounds = circleMethodRounds(7);
      expect(rounds).toHaveLength(7);
      for (const round of rounds) {
        expect(round).toHaveLength(3);
      }
    });
  });

  describe("pair coverage", () => {
    it("every pair (i,j) with i<j appears exactly once for n=4", () => {
      const rounds = circleMethodRounds(4);
      const seen = new Set<string>();
      for (const round of rounds) {
        for (const [a, b] of round) {
          const key = a < b ? `${a}-${b}` : `${b}-${a}`;
          expect(seen.has(key)).toBe(false);
          seen.add(key);
        }
      }
      expect(seen.size).toBe(6); // C(4,2)
    });

    it("every pair appears exactly once for n=6", () => {
      const rounds = circleMethodRounds(6);
      const seen = new Set<string>();
      for (const round of rounds) {
        for (const [a, b] of round) {
          const key = a < b ? `${a}-${b}` : `${b}-${a}`;
          expect(seen.has(key)).toBe(false);
          seen.add(key);
        }
      }
      expect(seen.size).toBe(15); // C(6,2)
    });

    it("every pair appears exactly once for n=5", () => {
      const rounds = circleMethodRounds(5);
      const seen = new Set<string>();
      for (const round of rounds) {
        for (const [a, b] of round) {
          const key = a < b ? `${a}-${b}` : `${b}-${a}`;
          expect(seen.has(key)).toBe(false);
          seen.add(key);
        }
      }
      expect(seen.size).toBe(10); // C(5,2)
    });
  });

  describe("pair-disjoint within a round", () => {
    it("no team appears twice in the same round for n=6", () => {
      const rounds = circleMethodRounds(6);
      expect(rounds.length).toBeGreaterThan(0);
      for (const round of rounds) {
        const teams = new Set<number>();
        for (const [a, b] of round) {
          expect(teams.has(a)).toBe(false);
          expect(teams.has(b)).toBe(false);
          teams.add(a);
          teams.add(b);
        }
      }
    });

    it("no team appears twice in the same round for odd n=7", () => {
      const rounds = circleMethodRounds(7);
      expect(rounds.length).toBeGreaterThan(0);
      for (const round of rounds) {
        const teams = new Set<number>();
        for (const [a, b] of round) {
          expect(teams.has(a)).toBe(false);
          expect(teams.has(b)).toBe(false);
          teams.add(a);
          teams.add(b);
        }
      }
    });
  });

  describe("bye rotation for odd n", () => {
    it("n=5: each team byes exactly once across 5 rounds", () => {
      const rounds = circleMethodRounds(5);
      const byeCounts = new Array(5).fill(0);
      for (const round of rounds) {
        const playing = new Set<number>();
        for (const [a, b] of round) {
          playing.add(a);
          playing.add(b);
        }
        for (let t = 0; t < 5; t++) {
          if (!playing.has(t)) byeCounts[t]++;
        }
      }
      for (const c of byeCounts) expect(c).toBe(1);
    });

    it("n=7: each team byes exactly once", () => {
      const rounds = circleMethodRounds(7);
      const byeCounts = new Array(7).fill(0);
      for (const round of rounds) {
        const playing = new Set<number>();
        for (const [a, b] of round) {
          playing.add(a);
          playing.add(b);
        }
        for (let t = 0; t < 7; t++) {
          if (!playing.has(t)) byeCounts[t]++;
        }
      }
      for (const c of byeCounts) expect(c).toBe(1);
    });
  });

  describe("play counts for even n", () => {
    it("n=6: each team plays in every round", () => {
      const rounds = circleMethodRounds(6);
      expect(rounds.length).toBeGreaterThan(0);
      for (const round of rounds) {
        const playing = new Set<number>();
        for (const [a, b] of round) {
          playing.add(a);
          playing.add(b);
        }
        expect(playing.size).toBe(6);
      }
    });
  });

  describe("determinism", () => {
    it("returns identical output across multiple calls", () => {
      const a = circleMethodRounds(6);
      const b = circleMethodRounds(6);
      expect(a).toEqual(b);
    });
  });
});
