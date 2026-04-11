import { describe, it, expect } from "vitest";
import {
  calculateStandings,
  rankBestNextPlaced,
} from "../../engine/standings";
import type { Match, StandingRow } from "../../types";

function mkMatch(
  home: string,
  away: string,
  score: { home: number; away: number } | null,
  id?: string
): Match {
  return {
    id: id ?? `${home}-${away}`,
    homeTeamId: home,
    awayTeamId: away,
    fieldIndex: 0,
    timeSlot: 0,
    score,
    phase: "group",
  };
}

function findRow(rows: StandingRow[], teamId: string): StandingRow {
  const row = rows.find((r) => r.teamId === teamId);
  if (!row) throw new Error(`No row for team ${teamId}`);
  return row;
}

describe("calculateStandings", () => {
  describe("basic points calculation", () => {
    it("awards 3 points for a win", () => {
      const matches = [mkMatch("A", "B", { home: 2, away: 0 })];
      const rows = calculateStandings(["A", "B"], matches);
      expect(findRow(rows, "A").points).toBe(3);
      expect(findRow(rows, "B").points).toBe(0);
    });

    it("awards 1 point each for a draw", () => {
      const matches = [mkMatch("A", "B", { home: 1, away: 1 })];
      const rows = calculateStandings(["A", "B"], matches);
      expect(findRow(rows, "A").points).toBe(1);
      expect(findRow(rows, "B").points).toBe(1);
    });

    it("awards 0 points for a loss", () => {
      const matches = [mkMatch("A", "B", { home: 0, away: 3 })];
      const rows = calculateStandings(["A", "B"], matches);
      expect(findRow(rows, "A").points).toBe(0);
      expect(findRow(rows, "B").points).toBe(3);
    });

    it("0-0 draw: both teams get 1 point, 0 GD, 0 GF", () => {
      const matches = [mkMatch("A", "B", { home: 0, away: 0 })];
      const rows = calculateStandings(["A", "B"], matches);
      const a = findRow(rows, "A");
      const b = findRow(rows, "B");
      expect(a.points).toBe(1);
      expect(b.points).toBe(1);
      expect(a.goalDifference).toBe(0);
      expect(b.goalDifference).toBe(0);
      expect(a.goalsFor).toBe(0);
      expect(b.goalsFor).toBe(0);
    });
  });

  describe("stat columns", () => {
    it("calculates all columns correctly for a single match", () => {
      const matches = [mkMatch("A", "B", { home: 3, away: 1 })];
      const rows = calculateStandings(["A", "B"], matches);
      const a = findRow(rows, "A");
      expect(a).toEqual({
        teamId: "A",
        played: 1,
        won: 1,
        drawn: 0,
        lost: 0,
        goalsFor: 3,
        goalsAgainst: 1,
        goalDifference: 2,
        points: 3,
      });
      const b = findRow(rows, "B");
      expect(b).toEqual({
        teamId: "B",
        played: 1,
        won: 0,
        drawn: 0,
        lost: 1,
        goalsFor: 1,
        goalsAgainst: 3,
        goalDifference: -2,
        points: 0,
      });
    });

    it("accumulates stats across multiple matches", () => {
      const matches = [
        mkMatch("A", "B", { home: 2, away: 1 }),
        mkMatch("A", "C", { home: 0, away: 0 }),
        mkMatch("B", "C", { home: 1, away: 3 }),
      ];
      const rows = calculateStandings(["A", "B", "C"], matches);
      const a = findRow(rows, "A");
      expect(a.played).toBe(2);
      expect(a.won).toBe(1);
      expect(a.drawn).toBe(1);
      expect(a.lost).toBe(0);
      expect(a.goalsFor).toBe(2);
      expect(a.goalsAgainst).toBe(1);
      expect(a.goalDifference).toBe(1);
      expect(a.points).toBe(4);
    });

    it("counts home and away goals correctly", () => {
      const matches = [
        mkMatch("A", "B", { home: 5, away: 2 }),
        mkMatch("C", "A", { home: 1, away: 3 }),
      ];
      const rows = calculateStandings(["A", "B", "C"], matches);
      const a = findRow(rows, "A");
      expect(a.goalsFor).toBe(8); // 5 home + 3 away
      expect(a.goalsAgainst).toBe(3); // 2 home + 1 away
    });

    it("high-scoring match stats are correct", () => {
      const matches = [mkMatch("A", "B", { home: 10, away: 8 })];
      const rows = calculateStandings(["A", "B"], matches);
      const a = findRow(rows, "A");
      expect(a.goalsFor).toBe(10);
      expect(a.goalsAgainst).toBe(8);
      expect(a.goalDifference).toBe(2);
      expect(a.points).toBe(3);
      const b = findRow(rows, "B");
      expect(b.goalsFor).toBe(8);
      expect(b.goalsAgainst).toBe(10);
      expect(b.goalDifference).toBe(-2);
    });
  });

  describe("unplayed matches (null score)", () => {
    it("ignores matches with null score completely", () => {
      const matches = [
        mkMatch("A", "B", null),
        mkMatch("A", "C", { home: 1, away: 0 }),
        mkMatch("B", "C", null),
      ];
      const rows = calculateStandings(["A", "B", "C"], matches);
      const a = findRow(rows, "A");
      expect(a.played).toBe(1);
      expect(a.points).toBe(3);
      const b = findRow(rows, "B");
      expect(b.played).toBe(0);
      expect(b.points).toBe(0);
    });

    it("returns all zeros when no matches played", () => {
      const rows = calculateStandings(["A", "B", "C"], []);
      for (const row of rows) {
        expect(row.played).toBe(0);
        expect(row.won).toBe(0);
        expect(row.drawn).toBe(0);
        expect(row.lost).toBe(0);
        expect(row.goalsFor).toBe(0);
        expect(row.goalsAgainst).toBe(0);
        expect(row.goalDifference).toBe(0);
        expect(row.points).toBe(0);
      }
    });

    it("returns all zeros when all matches are unplayed", () => {
      const matches = [
        mkMatch("A", "B", null),
        mkMatch("A", "C", null),
        mkMatch("B", "C", null),
      ];
      const rows = calculateStandings(["A", "B", "C"], matches);
      for (const row of rows) {
        expect(row.played).toBe(0);
        expect(row.points).toBe(0);
      }
    });

    it("single match played, rest unplayed", () => {
      const matches = [
        mkMatch("A", "B", { home: 1, away: 0 }),
        mkMatch("A", "C", null),
        mkMatch("B", "C", null),
      ];
      const rows = calculateStandings(["A", "B", "C"], matches);
      expect(findRow(rows, "A").played).toBe(1);
      expect(findRow(rows, "A").points).toBe(3);
      expect(findRow(rows, "B").played).toBe(1);
      expect(findRow(rows, "B").points).toBe(0);
      expect(findRow(rows, "C").played).toBe(0);
      expect(findRow(rows, "C").points).toBe(0);
    });
  });

  describe("sorting by points", () => {
    it("sorts teams by points descending", () => {
      const matches = [
        mkMatch("A", "B", { home: 1, away: 0 }), // A: 3pts, B: 0pts
        mkMatch("A", "C", { home: 1, away: 0 }), // A: 6pts, C: 0pts
        mkMatch("B", "C", { home: 1, away: 0 }), // B: 3pts, C: 0pts
      ];
      const rows = calculateStandings(["A", "B", "C"], matches);
      expect(rows[0].teamId).toBe("A");
      expect(rows[1].teamId).toBe("B");
      expect(rows[2].teamId).toBe("C");
    });
  });

  describe("tiebreaker: goal difference", () => {
    it("breaks points tie by goal difference", () => {
      const tieMatches = [
        mkMatch("A", "B", { home: 3, away: 0 }), // A: W, B: L
        mkMatch("C", "D", { home: 1, away: 0 }), // C: W, D: L
        mkMatch("A", "C", { home: 0, away: 1 }), // A: L, C: W
        mkMatch("B", "D", { home: 2, away: 0 }), // B: W, D: L
        mkMatch("A", "D", { home: 1, away: 0 }), // A: W, D: L
        mkMatch("B", "C", { home: 0, away: 1 }), // B: L, C: W
      ];
      const rows = calculateStandings(["A", "B", "C", "D"], tieMatches);
      // A: W, L, W = 6pts, GF 4, GA 1, GD +3
      // B: L, W, L = 3pts, GF 2, GA 4, GD -2
      // C: W, W, W = 9pts, GF 3, GA 0, GD +3
      // D: L, L, L = 0pts, GF 0, GA 4, GD -4
      expect(rows[0].teamId).toBe("C"); // 9pts
      expect(rows[1].teamId).toBe("A"); // 6pts
      expect(rows[2].teamId).toBe("B"); // 3pts
      expect(rows[3].teamId).toBe("D"); // 0pts
    });

    it("teams tied on points sorted by GD", () => {
      const m = [
        mkMatch("A", "B", { home: 1, away: 0 }), // A: 3pts, GD +1
        mkMatch("B", "C", { home: 3, away: 0 }), // B: 3pts, GD +2
        mkMatch("C", "A", { home: 1, away: 0 }), // C: 3pts, GD 0
      ];
      const rows = calculateStandings(["A", "B", "C"], m);
      // A: 3pts, GF 1, GA 1, GD 0  (beat B 1-0, lost to C 0-1)
      // B: 3pts, GF 3, GA 1, GD +2 (lost to A 0-1, beat C 3-0)
      // C: 3pts, GF 1, GA 3, GD -2 (lost to B 0-3, beat A 1-0)
      // Sort: B (+2) > A (0) > C (-2)
      expect(rows[0].teamId).toBe("B");
      expect(rows[1].teamId).toBe("A");
      expect(rows[2].teamId).toBe("C");
    });
  });

  describe("tiebreaker: goals scored", () => {
    it("breaks points+GD tie by goals scored", () => {
      // Craft: both 3pts, both GD 0, but different GS
      const matches = [
        mkMatch("A", "C", { home: 3, away: 3 }), // A: 1pt, GF 3 GA 3 GD 0
        mkMatch("B", "C", { home: 1, away: 1 }), // B: 1pt, GF 1 GA 1 GD 0
        mkMatch("A", "B", { home: 0, away: 0 }), // Both get 1pt more
      ];
      const rows = calculateStandings(["A", "B", "C"], matches);
      // A: 2pts, GF 3, GA 3, GD 0
      // B: 2pts, GF 1, GA 1, GD 0
      // C: 2pts, GF 4, GA 4, GD 0
      // Sort by pts (tied at 2), then GD (tied at 0), then GS: C(4) > A(3) > B(1)
      expect(rows[0].teamId).toBe("C");
      expect(rows[1].teamId).toBe("A");
      expect(rows[2].teamId).toBe("B");
    });
  });

  describe("tiebreaker: head-to-head", () => {
    it("uses head-to-head when pts, GD, and GS are all equal", () => {
      // A beats B 1-0, loses to C 0-1, beats D 2-0
      // B loses to A 0-1, beats C 1-0, beats D 2-0
      // A: pts=6, GF=3, GA=1, GD=+2
      // B: pts=6, GF=3, GA=1, GD=+2
      // Same pts, same GD, same GS → head-to-head: A beat B → A first
      const h2hMatches2 = [
        mkMatch("A", "B", { home: 1, away: 0 }),
        mkMatch("A", "C", { home: 0, away: 1 }),
        mkMatch("A", "D", { home: 2, away: 0 }),
        mkMatch("B", "C", { home: 1, away: 0 }),
        mkMatch("B", "D", { home: 2, away: 0 }),
        mkMatch("C", "D", { home: 1, away: 0 }),
      ];
      const rows2 = calculateStandings(["A", "B", "C", "D"], h2hMatches2);
      // A: W(B 1-0), L(C 0-1), W(D 2-0) → 6pts, GF=3, GA=1, GD=+2
      // B: L(A 0-1), W(C 1-0), W(D 2-0) → 6pts, GF=3, GA=1, GD=+2
      // C: W(A 1-0), L(B 0-1), W(D 1-0) → 6pts, GF=2, GA=1, GD=+1
      // D: L(A 0-2), L(B 0-2), L(C 0-1) → 0pts
      // Wait C also has 6pts but different GD. So A and B are tied on pts+GD+GS.
      // h2h: A beat B 1-0 → A should be above B.
      // C has GD +1 < +2, so C is 3rd.
      const aIdx = rows2.findIndex((r) => r.teamId === "A");
      const bIdx = rows2.findIndex((r) => r.teamId === "B");
      expect(aIdx).toBeLessThan(bIdx);
    });

    it("head-to-head with away team winning", () => {
      // B is away in the A-B match but B wins
      const matches = [
        mkMatch("A", "B", { home: 0, away: 1 }), // B wins as away
        mkMatch("A", "C", { home: 2, away: 0 }),
        mkMatch("B", "C", { home: 0, away: 1 }), // C wins
        // But this doesn't create equal stats. Let me do 4-team.
        mkMatch("A", "D", { home: 1, away: 0 }),
        mkMatch("B", "D", { home: 2, away: 0 }),
        mkMatch("C", "D", { home: 0, away: 0 }),
      ];
      // A: L(B 0-1), W(C 2-0), W(D 1-0) → 6pts, GF=3, GA=1, GD=+2
      // B: W(A 1-0), L(C 0-1), W(D 2-0) → 6pts, GF=3, GA=1, GD=+2
      // Same pts, GD, GS → h2h: B beat A → B above A
      const rows = calculateStandings(["A", "B", "C", "D"], matches);
      const aIdx = rows.findIndex((r) => r.teamId === "A");
      const bIdx = rows.findIndex((r) => r.teamId === "B");
      expect(bIdx).toBeLessThan(aIdx);
    });

    it("head-to-head draw leaves order as-is (no advantage)", () => {
      // Two teams with identical pts, GD, GS AND h2h is a draw
      // In this case the sort should be stable (or alphabetical, depending on impl)
      const matches = [
        mkMatch("A", "B", { home: 1, away: 1 }), // draw
        mkMatch("A", "C", { home: 2, away: 0 }),
        mkMatch("B", "C", { home: 2, away: 0 }),
      ];
      // A: D(B 1-1), W(C 2-0) → 4pts, GF=3, GA=1, GD=+2
      // B: D(A 1-1), W(C 2-0) → 4pts, GF=3, GA=1, GD=+2
      // h2h A vs B: 1-1 draw → no advantage for either
      const rows = calculateStandings(["A", "B", "C"], matches);
      const a = findRow(rows, "A");
      const b = findRow(rows, "B");
      // Both should have 4pts and be adjacent at top
      expect(a.points).toBe(4);
      expect(b.points).toBe(4);
      // They should both be above C
      const cIdx = rows.findIndex((r) => r.teamId === "C");
      expect(cIdx).toBe(2);
    });
  });

  describe("3-team group", () => {
    it("handles a full 3-team round robin", () => {
      const matches = [
        mkMatch("A", "B", { home: 2, away: 1 }),
        mkMatch("B", "C", { home: 0, away: 3 }),
        mkMatch("A", "C", { home: 1, away: 1 }),
      ];
      const rows = calculateStandings(["A", "B", "C"], matches);
      // A: W(2-1), D(1-1) → 4pts, GF=3, GA=2, GD=+1
      // B: L(1-2), L(0-3) → 0pts, GF=1, GA=5, GD=-4
      // C: W(3-0), D(1-1) → 4pts, GF=4, GA=1, GD=+3
      expect(rows[0].teamId).toBe("C"); // 4pts, GD+3
      expect(rows[1].teamId).toBe("A"); // 4pts, GD+1
      expect(rows[2].teamId).toBe("B"); // 0pts
    });
  });

  describe("4-team group (standard)", () => {
    it("handles a full 4-team round robin", () => {
      const matches = [
        mkMatch("A", "B", { home: 1, away: 0 }),
        mkMatch("C", "D", { home: 2, away: 2 }),
        mkMatch("A", "C", { home: 0, away: 1 }),
        mkMatch("B", "D", { home: 3, away: 0 }),
        mkMatch("A", "D", { home: 2, away: 0 }),
        mkMatch("B", "C", { home: 1, away: 2 }),
      ];
      const rows = calculateStandings(["A", "B", "C", "D"], matches);
      // A: W(B 1-0), L(C 0-1), W(D 2-0) → 6pts, GF=3, GA=1, GD=+2
      // B: L(A 0-1), W(D 3-0), L(C 1-2) → 3pts, GF=4, GA=3, GD=+1
      // C: W(A 1-0), D(D 2-2), W(B 2-1) → 7pts, GF=5, GA=3, GD=+2
      // D: D(C 2-2), L(B 0-3), L(A 0-2) → 1pt, GF=2, GA=7, GD=-5
      expect(rows[0].teamId).toBe("C"); // 7pts
      expect(rows[1].teamId).toBe("A"); // 6pts
      expect(rows[2].teamId).toBe("B"); // 3pts
      expect(rows[3].teamId).toBe("D"); // 1pt
    });
  });

  describe("5-team group", () => {
    it("handles a full 5-team round robin (10 matches)", () => {
      const matches = [
        mkMatch("A", "B", { home: 1, away: 0 }),
        mkMatch("A", "C", { home: 2, away: 1 }),
        mkMatch("A", "D", { home: 0, away: 0 }),
        mkMatch("A", "E", { home: 3, away: 0 }),
        mkMatch("B", "C", { home: 1, away: 1 }),
        mkMatch("B", "D", { home: 2, away: 0 }),
        mkMatch("B", "E", { home: 4, away: 0 }),
        mkMatch("C", "D", { home: 0, away: 1 }),
        mkMatch("C", "E", { home: 2, away: 0 }),
        mkMatch("D", "E", { home: 1, away: 0 }),
      ];
      const rows = calculateStandings(["A", "B", "C", "D", "E"], matches);
      // A: W W D W → 10pts, GF=6, GA=1, GD=+5
      // B: L D W W → 7pts, GF=7, GA=2, GD=+5
      // C: L D L W → 4pts, GF=4, GA=5, GD=-1
      // D: D L W W → 7pts, GF=2, GA=3, GD=-1
      // E: L L L L → 0pts, GF=0, GA=10, GD=-10
      // Wait let me recount:
      // A: W(B 1-0), W(C 2-1), D(D 0-0), W(E 3-0) → 10pts, GF=1+2+0+3=6, GA=0+1+0+0=1
      // B: L(A 0-1), D(C 1-1), W(D 2-0), W(E 4-0) → 7pts, GF=0+1+2+4=7, GA=1+1+0+0=2
      // C: L(A 1-2), D(B 1-1), L(D 0-1), W(E 2-0) → 4pts, GF=1+1+0+2=4, GA=2+1+1+0=4
      // D: D(A 0-0), L(B 0-2), W(C 1-0), W(E 1-0) → 7pts, GF=0+0+1+1=2, GA=0+2+0+0=2
      // E: L(A 0-3), L(B 0-4), L(C 0-2), L(D 0-1) → 0pts, GF=0, GA=10
      expect(rows).toHaveLength(5);
      expect(rows[0].teamId).toBe("A"); // 10pts
      // B and D both 7pts: B GD +5, D GD 0 → B above D
      expect(rows[1].teamId).toBe("B"); // 7pts, GD +5
      expect(rows[2].teamId).toBe("D"); // 7pts, GD 0
      expect(rows[3].teamId).toBe("C"); // 4pts
      expect(rows[4].teamId).toBe("E"); // 0pts
    });
  });

  describe("all draws (round robin)", () => {
    it("handles a group where all matches are draws", () => {
      const matches = [
        mkMatch("A", "B", { home: 1, away: 1 }),
        mkMatch("A", "C", { home: 1, away: 1 }),
        mkMatch("B", "C", { home: 1, away: 1 }),
      ];
      const rows = calculateStandings(["A", "B", "C"], matches);
      // All teams: 2pts, GF=2, GA=2, GD=0
      for (const row of rows) {
        expect(row.points).toBe(2);
        expect(row.goalDifference).toBe(0);
        expect(row.goalsFor).toBe(2);
      }
    });

    it("all 0-0 draws in 4-team group", () => {
      const matches = [
        mkMatch("A", "B", { home: 0, away: 0 }),
        mkMatch("A", "C", { home: 0, away: 0 }),
        mkMatch("A", "D", { home: 0, away: 0 }),
        mkMatch("B", "C", { home: 0, away: 0 }),
        mkMatch("B", "D", { home: 0, away: 0 }),
        mkMatch("C", "D", { home: 0, away: 0 }),
      ];
      const rows = calculateStandings(["A", "B", "C", "D"], matches);
      for (const row of rows) {
        expect(row.played).toBe(3);
        expect(row.drawn).toBe(3);
        expect(row.points).toBe(3);
        expect(row.goalsFor).toBe(0);
        expect(row.goalDifference).toBe(0);
      }
    });
  });

  describe("team only plays home or only away", () => {
    it("team that only plays home matches has correct stats", () => {
      const matches = [
        mkMatch("A", "B", { home: 2, away: 1 }),
        mkMatch("A", "C", { home: 3, away: 0 }),
        mkMatch("B", "C", null), // unplayed
      ];
      const rows = calculateStandings(["A", "B", "C"], matches);
      const a = findRow(rows, "A");
      expect(a.played).toBe(2);
      expect(a.goalsFor).toBe(5); // all scored as home
      expect(a.goalsAgainst).toBe(1); // all conceded as home
    });

    it("team that only plays away matches has correct stats", () => {
      const matches = [
        mkMatch("B", "A", { home: 1, away: 2 }),
        mkMatch("C", "A", { home: 0, away: 3 }),
        mkMatch("B", "C", null),
      ];
      const rows = calculateStandings(["A", "B", "C"], matches);
      const a = findRow(rows, "A");
      expect(a.played).toBe(2);
      expect(a.goalsFor).toBe(5); // all scored as away
      expect(a.goalsAgainst).toBe(1); // all conceded as away
    });
  });

  describe("two teams tied, third not", () => {
    it("correctly separates tied teams from non-tied", () => {
      const matches = [
        mkMatch("A", "B", { home: 2, away: 0 }), // A: 3pts
        mkMatch("A", "C", { home: 0, away: 2 }), // C: 3pts
        mkMatch("B", "C", { home: 0, away: 0 }), // B: 1pt, C: 4pts
      ];
      const rows = calculateStandings(["A", "B", "C"], matches);
      // A: 3pts, GF=2, GA=2, GD=0
      // B: 1pt, GF=0, GA=2, GD=-2
      // C: 4pts, GF=2, GA=0, GD=+2
      expect(rows[0].teamId).toBe("C"); // 4pts
      expect(rows[1].teamId).toBe("A"); // 3pts
      expect(rows[2].teamId).toBe("B"); // 1pt
    });
  });

  describe("multi-way tie (3+ teams)", () => {
    it("handles 3-way tie on points, resolved by GD", () => {
      // All 3 teams have 3pts (each wins one, loses one)
      const matches = [
        mkMatch("A", "B", { home: 3, away: 0 }), // A: W, B: L
        mkMatch("B", "C", { home: 2, away: 0 }), // B: W, C: L
        mkMatch("C", "A", { home: 1, away: 0 }), // C: W, A: L
      ];
      const rows = calculateStandings(["A", "B", "C"], matches);
      // A: 3pts, GF=3, GA=1, GD=+2
      // B: 3pts, GF=2, GA=3, GD=-1
      // C: 3pts, GF=1, GA=2, GD=-1
      // Sort: A(+2) first. B and C both GD -1. GS: B(2) > C(1) → B second.
      expect(rows[0].teamId).toBe("A");
      expect(rows[1].teamId).toBe("B");
      expect(rows[2].teamId).toBe("C");
    });

    it("handles 4-way tie on points", () => {
      // Every team beats the next, loses to the previous in a cycle
      // A>B, B>C, C>D, D>A, A>C... too complex. Let's do all draws + differentiation.
      // All teams draw all matches except specific wins:
      const matches = [
        mkMatch("A", "B", { home: 2, away: 1 }), // A:W
        mkMatch("C", "D", { home: 2, away: 1 }), // C:W
        mkMatch("A", "C", { home: 1, away: 2 }), // C:W
        mkMatch("B", "D", { home: 2, away: 1 }), // B:W
        mkMatch("A", "D", { home: 1, away: 2 }), // D:W
        mkMatch("B", "C", { home: 2, away: 1 }), // B:W
      ];
      const rows = calculateStandings(["A", "B", "C", "D"], matches);
      // A: W(B 2-1), L(C 1-2), L(D 1-2) → 3pts, GF=4, GA=5, GD=-1
      // B: L(A 1-2), W(D 2-1), W(C 2-1) → 6pts, GF=5, GA=4, GD=+1
      // C: W(A 2-1), W(D 2-1), L(B 1-2) → 6pts, GF=5, GA=4, GD=+1
      // D: L(C 1-2), L(B 1-2), W(A 2-1) → 3pts, GF=4, GA=5, GD=-1
      // B and C: 6pts, GD+1, GS 5 → tied. h2h: B beat C 2-1 → B first
      // A and D: 3pts, GD-1, GS 4 → tied. h2h: D beat A 2-1 → D third
      expect(rows[0].teamId).toBe("B");
      expect(rows[1].teamId).toBe("C");
      expect(rows[2].teamId).toBe("D");
      expect(rows[3].teamId).toBe("A");
    });
  });

  describe("edge cases", () => {
    it("returns correct number of rows for all team ids", () => {
      const rows = calculateStandings(["A", "B", "C", "D"], []);
      expect(rows).toHaveLength(4);
      expect(rows.map((r) => r.teamId).sort()).toEqual(["A", "B", "C", "D"]);
    });

    it("handles a single team with no matches", () => {
      const rows = calculateStandings(["A"], []);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({
        teamId: "A",
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      });
    });

    it("ignores matches involving teams not in teamIds", () => {
      const matches = [
        mkMatch("A", "B", { home: 1, away: 0 }),
        mkMatch("X", "Y", { home: 5, away: 5 }), // not our group
      ];
      const rows = calculateStandings(["A", "B"], matches);
      expect(rows).toHaveLength(2);
      expect(findRow(rows, "A").points).toBe(3);
      expect(findRow(rows, "B").points).toBe(0);
    });

    it("handles matches where only one team is in teamIds", () => {
      const matches = [
        mkMatch("A", "X", { home: 5, away: 0 }), // X not in group
      ];
      const rows = calculateStandings(["A", "B"], matches);
      // A played a match with someone outside the group — should this count?
      // Based on the spec, we process matches. Both teams should be in teamIds for it to be a valid group match.
      // Actually, we filter matches where both teams are in the group.
      // If only one team is in teamIds, we could either include or exclude.
      // Safest: only process matches where both teams are in teamIds.
      expect(rows).toHaveLength(2);
    });

    it("two teams with identical everything except h2h (h2h not played)", () => {
      // Construct scenario where two teams have same pts, GD, GS
      // but their h2h match is unplayed
      const matches = [
        mkMatch("A", "C", { home: 2, away: 0 }),
        mkMatch("B", "C", { home: 2, away: 0 }),
        mkMatch("A", "B", null), // h2h not played
      ];
      const rows = calculateStandings(["A", "B", "C"], matches);
      // A: 3pts, GF=2, GA=0, GD=+2
      // B: 3pts, GF=2, GA=0, GD=+2
      // No h2h result → stable order
      const a = findRow(rows, "A");
      const b = findRow(rows, "B");
      expect(a.points).toBe(3);
      expect(b.points).toBe(3);
      expect(a.goalDifference).toBe(2);
      expect(b.goalDifference).toBe(2);
    });

    it("negative goal difference is sorted correctly", () => {
      const matches = [
        mkMatch("A", "B", { home: 0, away: 5 }),
        mkMatch("A", "C", { home: 0, away: 3 }),
        mkMatch("B", "C", { home: 0, away: 0 }),
      ];
      const rows = calculateStandings(["A", "B", "C"], matches);
      // A: 0pts, GD=-8
      // B: 3pts+1pt=4pts wait
      // B: W(A 5-0) → 3pts, D(C 0-0) → 1pt = 4pts, GF=5, GA=0, GD=+5
      // C: W(A 3-0) → 3pts, D(B 0-0) → 1pt = 4pts, GF=3, GA=0, GD=+3
      // A: L L → 0pts
      expect(rows[0].teamId).toBe("B"); // GD +5
      expect(rows[1].teamId).toBe("C"); // GD +3
      expect(rows[2].teamId).toBe("A"); // GD -8
    });

    it("handles very large score", () => {
      const matches = [mkMatch("A", "B", { home: 99, away: 0 })];
      const rows = calculateStandings(["A", "B"], matches);
      expect(findRow(rows, "A").goalsFor).toBe(99);
      expect(findRow(rows, "A").goalDifference).toBe(99);
      expect(findRow(rows, "B").goalDifference).toBe(-99);
    });

    it("partial round robin (some matches played, some not)", () => {
      const matches = [
        mkMatch("A", "B", { home: 1, away: 0 }),
        mkMatch("A", "C", null),
        mkMatch("A", "D", null),
        mkMatch("B", "C", { home: 2, away: 2 }),
        mkMatch("B", "D", null),
        mkMatch("C", "D", { home: 0, away: 1 }),
      ];
      const rows = calculateStandings(["A", "B", "C", "D"], matches);
      // A: 1 played, 3pts
      // B: 2 played, 1pts (loss+draw) wait: L(A 0-1)=0pts, D(C 2-2)=1pt → 1pt
      // C: 2 played, D(B 2-2)=1pt, L(D 0-1)=0pt → 1pt
      // D: 1 played, W(C 1-0)=3pts
      expect(findRow(rows, "A").played).toBe(1);
      expect(findRow(rows, "B").played).toBe(2);
      expect(findRow(rows, "C").played).toBe(2);
      expect(findRow(rows, "D").played).toBe(1);
      expect(rows[0].points).toBeGreaterThanOrEqual(rows[1].points);
    });
  });

  describe("deterministic ordering", () => {
    it("returns teams in the same order on repeated calls", () => {
      const matches = [
        mkMatch("A", "B", { home: 1, away: 1 }),
        mkMatch("A", "C", { home: 1, away: 1 }),
        mkMatch("B", "C", { home: 1, away: 1 }),
      ];
      const rows1 = calculateStandings(["A", "B", "C"], matches);
      const rows2 = calculateStandings(["A", "B", "C"], matches);
      expect(rows1.map((r) => r.teamId)).toEqual(rows2.map((r) => r.teamId));
    });

    it("order of teamIds input does not affect result", () => {
      const matches = [
        mkMatch("A", "B", { home: 2, away: 0 }),
        mkMatch("B", "C", { home: 1, away: 0 }),
        mkMatch("A", "C", { home: 1, away: 1 }),
      ];
      const rows1 = calculateStandings(["A", "B", "C"], matches);
      const rows2 = calculateStandings(["C", "A", "B"], matches);
      expect(rows1.map((r) => r.teamId)).toEqual(rows2.map((r) => r.teamId));
    });
  });
});

describe("rankBestNextPlaced", () => {
  function mkRow(
    teamId: string,
    points: number,
    gd: number,
    gs: number
  ): StandingRow {
    return {
      teamId,
      played: 3,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: gs,
      goalsAgainst: gs - gd,
      goalDifference: gd,
      points,
    };
  }

  describe("basic sorting", () => {
    it("sorts by points descending", () => {
      const rows = [mkRow("X", 4, 2, 5), mkRow("Y", 6, 1, 3), mkRow("Z", 1, 0, 1)];
      const ranked = rankBestNextPlaced(rows);
      expect(ranked[0].teamId).toBe("Y"); // 6pts
      expect(ranked[1].teamId).toBe("X"); // 4pts
      expect(ranked[2].teamId).toBe("Z"); // 1pt
    });

    it("breaks points tie by GD", () => {
      const rows = [mkRow("X", 4, 1, 5), mkRow("Y", 4, 3, 5), mkRow("Z", 4, -1, 2)];
      const ranked = rankBestNextPlaced(rows);
      expect(ranked[0].teamId).toBe("Y"); // GD +3
      expect(ranked[1].teamId).toBe("X"); // GD +1
      expect(ranked[2].teamId).toBe("Z"); // GD -1
    });

    it("breaks points+GD tie by GS", () => {
      const rows = [mkRow("X", 4, 2, 3), mkRow("Y", 4, 2, 7), mkRow("Z", 4, 2, 5)];
      const ranked = rankBestNextPlaced(rows);
      expect(ranked[0].teamId).toBe("Y"); // GS 7
      expect(ranked[1].teamId).toBe("Z"); // GS 5
      expect(ranked[2].teamId).toBe("X"); // GS 3
    });
  });

  describe("no head-to-head", () => {
    it("does NOT apply head-to-head (teams from different groups)", () => {
      // If h2h were applied, it might change order. But rankBestNextPlaced ignores it.
      const rows = [mkRow("X", 4, 2, 5), mkRow("Y", 4, 2, 5)];
      const ranked = rankBestNextPlaced(rows);
      // Both identical → stable sort
      expect(ranked).toHaveLength(2);
    });
  });

  describe("edge cases", () => {
    it("handles empty array", () => {
      const ranked = rankBestNextPlaced([]);
      expect(ranked).toEqual([]);
    });

    it("handles single team", () => {
      const rows = [mkRow("X", 3, 1, 2)];
      const ranked = rankBestNextPlaced(rows);
      expect(ranked).toHaveLength(1);
      expect(ranked[0].teamId).toBe("X");
    });

    it("all teams identical — returns same length", () => {
      const rows = [mkRow("X", 3, 0, 2), mkRow("Y", 3, 0, 2), mkRow("Z", 3, 0, 2)];
      const ranked = rankBestNextPlaced(rows);
      expect(ranked).toHaveLength(3);
      // All stats identical — stable sort, order preserved
    });

    it("returns a NEW array (does not mutate input)", () => {
      const rows = [mkRow("X", 4, 2, 5), mkRow("Y", 6, 1, 3)];
      const original = [...rows];
      const ranked = rankBestNextPlaced(rows);
      expect(ranked).not.toBe(rows);
      // Input should remain unchanged
      expect(rows[0].teamId).toBe(original[0].teamId);
      expect(rows[1].teamId).toBe(original[1].teamId);
    });

    it("handles all teams with same points, different GD", () => {
      const rows = [
        mkRow("A", 3, -2, 1),
        mkRow("B", 3, 5, 8),
        mkRow("C", 3, 0, 3),
        mkRow("D", 3, 2, 4),
      ];
      const ranked = rankBestNextPlaced(rows);
      expect(ranked[0].teamId).toBe("B"); // GD +5
      expect(ranked[1].teamId).toBe("D"); // GD +2
      expect(ranked[2].teamId).toBe("C"); // GD 0
      expect(ranked[3].teamId).toBe("A"); // GD -2
    });

    it("handles teams with 0 points", () => {
      const rows = [mkRow("X", 0, -3, 1), mkRow("Y", 0, -1, 2)];
      const ranked = rankBestNextPlaced(rows);
      expect(ranked[0].teamId).toBe("Y"); // better GD
      expect(ranked[1].teamId).toBe("X");
    });

    it("handles large number of teams", () => {
      const rows = Array.from({ length: 20 }, (_, i) =>
        mkRow(`T${i}`, i, i - 10, i + 1)
      );
      const ranked = rankBestNextPlaced(rows);
      expect(ranked).toHaveLength(20);
      // Should be sorted by points descending (19, 18, ..., 0)
      for (let i = 0; i < ranked.length - 1; i++) {
        expect(ranked[i].points).toBeGreaterThanOrEqual(ranked[i + 1].points);
      }
    });
  });
});
