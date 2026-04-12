import { describe, it, expect } from "vitest";
import {
  generateKnockoutRounds,
  seedBracket,
  advanceWinner,
} from "../../engine/knockout";
import type { KnockoutRound } from "../../types";

describe("generateKnockoutRounds", () => {
  describe("bracket size 2 (Final only)", () => {
    it("produces 1 round with 1 match", () => {
      const rounds = generateKnockoutRounds(2);
      expect(rounds).toHaveLength(1);
      expect(rounds[0].matches).toHaveLength(1);
    });

    it("names the round 'Final'", () => {
      const rounds = generateKnockoutRounds(2);
      expect(rounds[0].name).toBe("Finale");
    });

    it("first-round match has Seed source descriptions", () => {
      const rounds = generateKnockoutRounds(2);
      expect(rounds[0].matches[0].homeSourceDescription).toBe("Positie 1");
      expect(rounds[0].matches[0].awaySourceDescription).toBe("Positie 2");
    });
  });

  describe("bracket size 4 (SF + Final)", () => {
    it("produces 2 rounds with 2+1 matches", () => {
      const rounds = generateKnockoutRounds(4);
      expect(rounds).toHaveLength(2);
      expect(rounds[0].matches).toHaveLength(2);
      expect(rounds[1].matches).toHaveLength(1);
    });

    it("names rounds Semi-final and Final", () => {
      const rounds = generateKnockoutRounds(4);
      expect(rounds[0].name).toBe("Halve finale");
      expect(rounds[1].name).toBe("Finale");
    });

    it("first-round matches have seed descriptions", () => {
      const rounds = generateKnockoutRounds(4);
      const [m0, m1] = rounds[0].matches;
      expect(m0.homeSourceDescription).toBe("Positie 1");
      expect(m0.awaySourceDescription).toBe("Positie 2");
      expect(m1.homeSourceDescription).toBe("Positie 3");
      expect(m1.awaySourceDescription).toBe("Positie 4");
    });

    it("final references winners from semis", () => {
      const rounds = generateKnockoutRounds(4);
      const final = rounds[1].matches[0];
      const sf0Id = rounds[0].matches[0].id;
      const sf1Id = rounds[0].matches[1].id;
      expect(final.homeSourceDescription).toBe(`Winnaar ${sf0Id}`);
      expect(final.awaySourceDescription).toBe(`Winnaar ${sf1Id}`);
    });
  });

  describe("bracket size 8 (QF + SF + Final)", () => {
    it("produces 3 rounds with 4+2+1 matches", () => {
      const rounds = generateKnockoutRounds(8);
      expect(rounds).toHaveLength(3);
      expect(rounds[0].matches).toHaveLength(4);
      expect(rounds[1].matches).toHaveLength(2);
      expect(rounds[2].matches).toHaveLength(1);
    });

    it("names rounds Quarter-final, Semi-final, Final", () => {
      const rounds = generateKnockoutRounds(8);
      expect(rounds[0].name).toBe("Kwartfinale");
      expect(rounds[1].name).toBe("Halve finale");
      expect(rounds[2].name).toBe("Finale");
    });

    it("first-round matches have seed descriptions 1-8", () => {
      const rounds = generateKnockoutRounds(8);
      for (let i = 0; i < 4; i++) {
        expect(rounds[0].matches[i].homeSourceDescription).toBe(
          `Positie ${i * 2 + 1}`
        );
        expect(rounds[0].matches[i].awaySourceDescription).toBe(
          `Positie ${i * 2 + 2}`
        );
      }
    });

    it("semi-finals reference QF match winners", () => {
      const rounds = generateKnockoutRounds(8);
      const sf0 = rounds[1].matches[0];
      const sf1 = rounds[1].matches[1];
      expect(sf0.homeSourceDescription).toBe(
        `Winnaar ${rounds[0].matches[0].id}`
      );
      expect(sf0.awaySourceDescription).toBe(
        `Winnaar ${rounds[0].matches[1].id}`
      );
      expect(sf1.homeSourceDescription).toBe(
        `Winnaar ${rounds[0].matches[2].id}`
      );
      expect(sf1.awaySourceDescription).toBe(
        `Winnaar ${rounds[0].matches[3].id}`
      );
    });

    it("final references SF match winners", () => {
      const rounds = generateKnockoutRounds(8);
      const final = rounds[2].matches[0];
      expect(final.homeSourceDescription).toBe(
        `Winnaar ${rounds[1].matches[0].id}`
      );
      expect(final.awaySourceDescription).toBe(
        `Winnaar ${rounds[1].matches[1].id}`
      );
    });
  });

  describe("bracket size 16", () => {
    it("produces 4 rounds with 8+4+2+1 matches", () => {
      const rounds = generateKnockoutRounds(16);
      expect(rounds).toHaveLength(4);
      expect(rounds[0].matches).toHaveLength(8);
      expect(rounds[1].matches).toHaveLength(4);
      expect(rounds[2].matches).toHaveLength(2);
      expect(rounds[3].matches).toHaveLength(1);
    });

    it("names first round 'Round of 16'", () => {
      const rounds = generateKnockoutRounds(16);
      expect(rounds[0].name).toBe("Achtste finales");
      expect(rounds[1].name).toBe("Kwartfinale");
      expect(rounds[2].name).toBe("Halve finale");
      expect(rounds[3].name).toBe("Finale");
    });

    it("first-round matches have seed descriptions 1-16", () => {
      const rounds = generateKnockoutRounds(16);
      for (let i = 0; i < 8; i++) {
        expect(rounds[0].matches[i].homeSourceDescription).toBe(
          `Positie ${i * 2 + 1}`
        );
        expect(rounds[0].matches[i].awaySourceDescription).toBe(
          `Positie ${i * 2 + 2}`
        );
      }
    });
  });

  describe("bracket size 32", () => {
    it("produces 5 rounds with 16+8+4+2+1 matches", () => {
      const rounds = generateKnockoutRounds(32);
      expect(rounds).toHaveLength(5);
      expect(rounds[0].matches).toHaveLength(16);
      expect(rounds[1].matches).toHaveLength(8);
      expect(rounds[2].matches).toHaveLength(4);
      expect(rounds[3].matches).toHaveLength(2);
      expect(rounds[4].matches).toHaveLength(1);
    });

    it("names first round 'Round of 32'", () => {
      const rounds = generateKnockoutRounds(32);
      expect(rounds[0].name).toBe("32ste finales");
      expect(rounds[1].name).toBe("Achtste finales");
      expect(rounds[2].name).toBe("Kwartfinale");
      expect(rounds[3].name).toBe("Halve finale");
      expect(rounds[4].name).toBe("Finale");
    });
  });

  describe("match property invariants", () => {
    it("all matches start with null teamIds", () => {
      for (const size of [2, 4, 8, 16, 32]) {
        const rounds = generateKnockoutRounds(size);
        for (const round of rounds) {
          for (const match of round.matches) {
            expect(match.homeTeamId).toBeNull();
            expect(match.awayTeamId).toBeNull();
          }
        }
      }
    });

    it("all matches have null score", () => {
      for (const size of [2, 4, 8, 16, 32]) {
        const rounds = generateKnockoutRounds(size);
        for (const round of rounds) {
          for (const match of round.matches) {
            expect(match.score).toBeNull();
          }
        }
      }
    });

    it("all matches have phase 'knockout'", () => {
      for (const size of [2, 4, 8, 16, 32]) {
        const rounds = generateKnockoutRounds(size);
        for (const round of rounds) {
          for (const match of round.matches) {
            expect(match.phase).toBe("knockout");
          }
        }
      }
    });

    it("all match IDs are unique across all rounds", () => {
      for (const size of [2, 4, 8, 16, 32]) {
        const rounds = generateKnockoutRounds(size);
        const allIds = rounds.flatMap((r) => r.matches.map((m) => m.id));
        expect(new Set(allIds).size).toBe(allIds.length);
      }
    });

    it("total match count equals bracketSize - 1", () => {
      for (const size of [2, 4, 8, 16, 32]) {
        const rounds = generateKnockoutRounds(size);
        const total = rounds.reduce((sum, r) => sum + r.matches.length, 0);
        expect(total).toBe(size - 1);
      }
    });

    it("match IDs have ko- prefix", () => {
      const rounds = generateKnockoutRounds(8);
      for (const round of rounds) {
        for (const match of round.matches) {
          expect(match.id).toMatch(/^ko-/);
        }
      }
    });
  });

  describe("source description chain integrity", () => {
    it("later round source descriptions reference actual match IDs from previous round", () => {
      for (const size of [4, 8, 16, 32]) {
        const rounds = generateKnockoutRounds(size);
        for (let r = 1; r < rounds.length; r++) {
          const prevMatchIds = new Set(
            rounds[r - 1].matches.map((m) => m.id)
          );
          for (const match of rounds[r].matches) {
            const homeRef = match.homeSourceDescription.replace("Winnaar ", "");
            const awayRef = match.awaySourceDescription.replace("Winnaar ", "");
            expect(prevMatchIds.has(homeRef)).toBe(true);
            expect(prevMatchIds.has(awayRef)).toBe(true);
          }
        }
      }
    });

    it("each previous round match is referenced exactly once in next round", () => {
      for (const size of [4, 8, 16, 32]) {
        const rounds = generateKnockoutRounds(size);
        for (let r = 1; r < rounds.length; r++) {
          const refs: string[] = [];
          for (const match of rounds[r].matches) {
            refs.push(match.homeSourceDescription.replace("Winnaar ", ""));
            refs.push(match.awaySourceDescription.replace("Winnaar ", ""));
          }
          const prevMatchIds = rounds[r - 1].matches.map((m) => m.id);
          expect(refs.sort()).toEqual(prevMatchIds.sort());
        }
      }
    });
  });
});

describe("seedBracket", () => {
  function makeTeams(
    groups: { groupId: string; count: number }[]
  ): { teamId: string; groupId: string }[] {
    const teams: { teamId: string; groupId: string }[] = [];
    for (const g of groups) {
      for (let i = 0; i < g.count; i++) {
        teams.push({ teamId: `${g.groupId}-t${i + 1}`, groupId: g.groupId });
      }
    }
    return teams;
  }

  describe("basic seeding", () => {
    it("places all 4 teams from 2 groups into first round", () => {
      const rounds = generateKnockoutRounds(4);
      const teams = makeTeams([
        { groupId: "A", count: 2 },
        { groupId: "B", count: 2 },
      ]);
      const seeded = seedBracket(rounds, teams);
      const firstRoundTeams = seeded[0].matches.flatMap((m) => [
        m.homeTeamId,
        m.awayTeamId,
      ]);
      expect(firstRoundTeams.filter(Boolean)).toHaveLength(4);
      for (const t of teams) {
        expect(firstRoundTeams).toContain(t.teamId);
      }
    });

    it("places all 8 teams from 4 groups into first round", () => {
      const rounds = generateKnockoutRounds(8);
      const teams = makeTeams([
        { groupId: "A", count: 2 },
        { groupId: "B", count: 2 },
        { groupId: "C", count: 2 },
        { groupId: "D", count: 2 },
      ]);
      const seeded = seedBracket(rounds, teams);
      const firstRoundTeams = seeded[0].matches.flatMap((m) => [
        m.homeTeamId,
        m.awayTeamId,
      ]);
      expect(firstRoundTeams.filter(Boolean)).toHaveLength(8);
      for (const t of teams) {
        expect(firstRoundTeams).toContain(t.teamId);
      }
    });

    it("places all 16 teams into first round", () => {
      const rounds = generateKnockoutRounds(16);
      const teams = makeTeams([
        { groupId: "A", count: 4 },
        { groupId: "B", count: 4 },
        { groupId: "C", count: 4 },
        { groupId: "D", count: 4 },
      ]);
      const seeded = seedBracket(rounds, teams);
      const firstRoundTeams = seeded[0].matches.flatMap((m) => [
        m.homeTeamId,
        m.awayTeamId,
      ]);
      expect(firstRoundTeams.filter(Boolean)).toHaveLength(16);
      for (const t of teams) {
        expect(firstRoundTeams).toContain(t.teamId);
      }
    });
  });

  describe("group avoidance in first round", () => {
    it("4 teams from 2 groups: no same-group matchup in first round", () => {
      const rounds = generateKnockoutRounds(4);
      const teams = makeTeams([
        { groupId: "A", count: 2 },
        { groupId: "B", count: 2 },
      ]);
      const seeded = seedBracket(rounds, teams);
      for (const match of seeded[0].matches) {
        if (match.homeTeamId && match.awayTeamId) {
          const homeGroup = teams.find(
            (t) => t.teamId === match.homeTeamId
          )!.groupId;
          const awayGroup = teams.find(
            (t) => t.teamId === match.awayTeamId
          )!.groupId;
          expect(homeGroup).not.toBe(awayGroup);
        }
      }
    });

    it("8 teams from 4 groups (2 per group): no same-group matchup in first round", () => {
      const rounds = generateKnockoutRounds(8);
      const teams = makeTeams([
        { groupId: "A", count: 2 },
        { groupId: "B", count: 2 },
        { groupId: "C", count: 2 },
        { groupId: "D", count: 2 },
      ]);
      const seeded = seedBracket(rounds, teams);
      for (const match of seeded[0].matches) {
        if (match.homeTeamId && match.awayTeamId) {
          const homeGroup = teams.find(
            (t) => t.teamId === match.homeTeamId
          )!.groupId;
          const awayGroup = teams.find(
            (t) => t.teamId === match.awayTeamId
          )!.groupId;
          expect(homeGroup).not.toBe(awayGroup);
        }
      }
    });

    it("6 teams from 3 groups (2 per group): no same-group matchup in first round of 8-bracket", () => {
      const rounds = generateKnockoutRounds(8);
      const teams = makeTeams([
        { groupId: "A", count: 2 },
        { groupId: "B", count: 2 },
        { groupId: "C", count: 2 },
      ]);
      const seeded = seedBracket(rounds, teams);
      for (const match of seeded[0].matches) {
        if (match.homeTeamId && match.awayTeamId) {
          const homeGroup = teams.find(
            (t) => t.teamId === match.homeTeamId
          )!.groupId;
          const awayGroup = teams.find(
            (t) => t.teamId === match.awayTeamId
          )!.groupId;
          expect(homeGroup).not.toBe(awayGroup);
        }
      }
    });
  });

  describe("impossible avoidance", () => {
    it("4 teams all from same group: still seeds all teams", () => {
      const rounds = generateKnockoutRounds(4);
      const teams = makeTeams([{ groupId: "A", count: 4 }]);
      const seeded = seedBracket(rounds, teams);
      const firstRoundTeams = seeded[0].matches.flatMap((m) => [
        m.homeTeamId,
        m.awayTeamId,
      ]);
      expect(firstRoundTeams.filter(Boolean)).toHaveLength(4);
      for (const t of teams) {
        expect(firstRoundTeams).toContain(t.teamId);
      }
    });

    it("3 teams from same group in 4-bracket: seeds all, one slot empty", () => {
      const rounds = generateKnockoutRounds(4);
      const teams = makeTeams([{ groupId: "A", count: 3 }]);
      const seeded = seedBracket(rounds, teams);
      const firstRoundTeams = seeded[0].matches
        .flatMap((m) => [m.homeTeamId, m.awayTeamId])
        .filter(Boolean);
      expect(firstRoundTeams).toHaveLength(3);
      for (const t of teams) {
        expect(firstRoundTeams).toContain(t.teamId);
      }
    });
  });

  describe("fewer teams than bracket slots", () => {
    it("4 teams in 8-bracket: places teams leaving some slots null", () => {
      const rounds = generateKnockoutRounds(8);
      const teams = makeTeams([
        { groupId: "A", count: 2 },
        { groupId: "B", count: 2 },
      ]);
      const seeded = seedBracket(rounds, teams);
      const firstRoundTeams = seeded[0].matches
        .flatMap((m) => [m.homeTeamId, m.awayTeamId])
        .filter(Boolean);
      expect(firstRoundTeams).toHaveLength(4);
      for (const t of teams) {
        expect(firstRoundTeams).toContain(t.teamId);
      }
    });

    it("2 teams in 4-bracket: only 2 slots filled", () => {
      const rounds = generateKnockoutRounds(4);
      const teams = makeTeams([
        { groupId: "A", count: 1 },
        { groupId: "B", count: 1 },
      ]);
      const seeded = seedBracket(rounds, teams);
      const firstRoundTeams = seeded[0].matches
        .flatMap((m) => [m.homeTeamId, m.awayTeamId])
        .filter(Boolean);
      expect(firstRoundTeams).toHaveLength(2);
    });
  });

  describe("no mutation", () => {
    it("does not mutate the original rounds", () => {
      const rounds = generateKnockoutRounds(4);
      const original = JSON.parse(JSON.stringify(rounds));
      const teams = makeTeams([
        { groupId: "A", count: 2 },
        { groupId: "B", count: 2 },
      ]);
      seedBracket(rounds, teams);
      expect(rounds).toEqual(original);
    });

    it("returned rounds are a different reference", () => {
      const rounds = generateKnockoutRounds(4);
      const teams = makeTeams([
        { groupId: "A", count: 2 },
        { groupId: "B", count: 2 },
      ]);
      const seeded = seedBracket(rounds, teams);
      expect(seeded).not.toBe(rounds);
      expect(seeded[0]).not.toBe(rounds[0]);
      expect(seeded[0].matches[0]).not.toBe(rounds[0].matches[0]);
    });
  });

  describe("empty / edge inputs", () => {
    it("handles 0 teams gracefully", () => {
      const rounds = generateKnockoutRounds(4);
      const seeded = seedBracket(rounds, []);
      const firstRoundTeams = seeded[0].matches
        .flatMap((m) => [m.homeTeamId, m.awayTeamId])
        .filter(Boolean);
      expect(firstRoundTeams).toHaveLength(0);
    });

    it("handles 1 team gracefully", () => {
      const rounds = generateKnockoutRounds(2);
      const teams = [{ teamId: "lone-wolf", groupId: "A" }];
      const seeded = seedBracket(rounds, teams);
      const firstRoundTeams = seeded[0].matches
        .flatMap((m) => [m.homeTeamId, m.awayTeamId])
        .filter(Boolean);
      expect(firstRoundTeams).toHaveLength(1);
      expect(firstRoundTeams).toContain("lone-wolf");
    });
  });

  describe("no duplicate placements", () => {
    it("each team appears exactly once in the bracket", () => {
      for (const size of [4, 8, 16]) {
        const rounds = generateKnockoutRounds(size);
        const teams = makeTeams(
          Array.from({ length: size / 2 }, (_, i) => ({
            groupId: String.fromCharCode(65 + i),
            count: 2,
          }))
        );
        const seeded = seedBracket(rounds, teams);
        const placed = seeded[0].matches
          .flatMap((m) => [m.homeTeamId, m.awayTeamId])
          .filter(Boolean);
        expect(new Set(placed).size).toBe(placed.length);
        expect(placed).toHaveLength(size);
      }
    });
  });

  describe("later rounds remain unchanged after seeding", () => {
    it("only first round gets team IDs, later rounds stay null", () => {
      const rounds = generateKnockoutRounds(8);
      const teams = makeTeams([
        { groupId: "A", count: 2 },
        { groupId: "B", count: 2 },
        { groupId: "C", count: 2 },
        { groupId: "D", count: 2 },
      ]);
      const seeded = seedBracket(rounds, teams);
      for (let r = 1; r < seeded.length; r++) {
        for (const match of seeded[r].matches) {
          expect(match.homeTeamId).toBeNull();
          expect(match.awayTeamId).toBeNull();
        }
      }
    });
  });
});

describe("advanceWinner", () => {
  function setScore(
    rounds: KnockoutRound[],
    matchId: string,
    home: number,
    away: number
  ): KnockoutRound[] {
    return rounds.map((r) => ({
      ...r,
      matches: r.matches.map((m) =>
        m.id === matchId ? { ...m, score: { home, away } } : { ...m }
      ),
    }));
  }

  function seedAndSetupBracket4() {
    let rounds = generateKnockoutRounds(4);
    rounds = seedBracket(rounds, [
      { teamId: "team-a", groupId: "A" },
      { teamId: "team-b", groupId: "B" },
      { teamId: "team-c", groupId: "A" },
      { teamId: "team-d", groupId: "B" },
    ]);
    return rounds;
  }

  describe("basic advancement", () => {
    it("home team wins and advances to correct slot", () => {
      let rounds = seedAndSetupBracket4();
      const m0Id = rounds[0].matches[0].id;
      rounds = setScore(rounds, m0Id, 3, 1);
      const advanced = advanceWinner(rounds, m0Id);
      const homeTeam = rounds[0].matches[0].homeTeamId;
      expect(advanced[1].matches[0].homeTeamId).toBe(homeTeam);
    });

    it("away team wins and advances to correct slot", () => {
      let rounds = seedAndSetupBracket4();
      const m0Id = rounds[0].matches[0].id;
      rounds = setScore(rounds, m0Id, 0, 2);
      const advanced = advanceWinner(rounds, m0Id);
      const awayTeam = rounds[0].matches[0].awayTeamId;
      expect(advanced[1].matches[0].homeTeamId).toBe(awayTeam);
    });

    it("match 0 winner → next round match 0 home", () => {
      let rounds = seedAndSetupBracket4();
      const m0Id = rounds[0].matches[0].id;
      rounds = setScore(rounds, m0Id, 2, 0);
      const advanced = advanceWinner(rounds, m0Id);
      expect(advanced[1].matches[0].homeTeamId).toBe(
        rounds[0].matches[0].homeTeamId
      );
    });

    it("match 1 winner → next round match 0 away", () => {
      let rounds = seedAndSetupBracket4();
      const m1Id = rounds[0].matches[1].id;
      rounds = setScore(rounds, m1Id, 2, 0);
      const advanced = advanceWinner(rounds, m1Id);
      expect(advanced[1].matches[0].awayTeamId).toBe(
        rounds[0].matches[1].homeTeamId
      );
    });
  });

  describe("8-team bracket advancement", () => {
    function seedAndSetupBracket8() {
      let rounds = generateKnockoutRounds(8);
      rounds = seedBracket(rounds, [
        { teamId: "t1", groupId: "A" },
        { teamId: "t2", groupId: "B" },
        { teamId: "t3", groupId: "C" },
        { teamId: "t4", groupId: "D" },
        { teamId: "t5", groupId: "A" },
        { teamId: "t6", groupId: "B" },
        { teamId: "t7", groupId: "C" },
        { teamId: "t8", groupId: "D" },
      ]);
      return rounds;
    }

    it("match 0 winner → SF match 0 home", () => {
      let rounds = seedAndSetupBracket8();
      const m0Id = rounds[0].matches[0].id;
      rounds = setScore(rounds, m0Id, 1, 0);
      const advanced = advanceWinner(rounds, m0Id);
      expect(advanced[1].matches[0].homeTeamId).toBe(
        rounds[0].matches[0].homeTeamId
      );
    });

    it("match 1 winner → SF match 0 away", () => {
      let rounds = seedAndSetupBracket8();
      const m1Id = rounds[0].matches[1].id;
      rounds = setScore(rounds, m1Id, 0, 3);
      const advanced = advanceWinner(rounds, m1Id);
      expect(advanced[1].matches[0].awayTeamId).toBe(
        rounds[0].matches[1].awayTeamId
      );
    });

    it("match 2 winner → SF match 1 home", () => {
      let rounds = seedAndSetupBracket8();
      const m2Id = rounds[0].matches[2].id;
      rounds = setScore(rounds, m2Id, 4, 0);
      const advanced = advanceWinner(rounds, m2Id);
      expect(advanced[1].matches[1].homeTeamId).toBe(
        rounds[0].matches[2].homeTeamId
      );
    });

    it("match 3 winner → SF match 1 away", () => {
      let rounds = seedAndSetupBracket8();
      const m3Id = rounds[0].matches[3].id;
      rounds = setScore(rounds, m3Id, 0, 1);
      const advanced = advanceWinner(rounds, m3Id);
      expect(advanced[1].matches[1].awayTeamId).toBe(
        rounds[0].matches[3].awayTeamId
      );
    });

    it("SF match winner advances to final", () => {
      let rounds = seedAndSetupBracket8();
      // Play QF match 0
      const qf0Id = rounds[0].matches[0].id;
      rounds = setScore(rounds, qf0Id, 2, 0);
      rounds = advanceWinner(rounds, qf0Id);
      // Play QF match 1
      const qf1Id = rounds[0].matches[1].id;
      rounds = setScore(rounds, qf1Id, 0, 1);
      rounds = advanceWinner(rounds, qf1Id);
      // Now SF match 0 should have both teams
      const sf0Id = rounds[1].matches[0].id;
      rounds = setScore(rounds, sf0Id, 3, 0);
      const advanced = advanceWinner(rounds, sf0Id);
      expect(advanced[2].matches[0].homeTeamId).toBe(
        rounds[1].matches[0].homeTeamId
      );
    });
  });

  describe("no mutation", () => {
    it("does not mutate the original rounds", () => {
      let rounds = seedAndSetupBracket4();
      const m0Id = rounds[0].matches[0].id;
      rounds = setScore(rounds, m0Id, 2, 0);
      const original = JSON.parse(JSON.stringify(rounds));
      advanceWinner(rounds, m0Id);
      expect(rounds).toEqual(original);
    });

    it("returned rounds are a different reference", () => {
      let rounds = seedAndSetupBracket4();
      const m0Id = rounds[0].matches[0].id;
      rounds = setScore(rounds, m0Id, 2, 0);
      const advanced = advanceWinner(rounds, m0Id);
      expect(advanced).not.toBe(rounds);
    });
  });

  describe("final match", () => {
    it("advancing final match winner returns rounds unchanged (no next round)", () => {
      let rounds = seedAndSetupBracket4();
      // Play both semis
      const sf0Id = rounds[0].matches[0].id;
      const sf1Id = rounds[0].matches[1].id;
      rounds = setScore(rounds, sf0Id, 2, 0);
      rounds = advanceWinner(rounds, sf0Id);
      rounds = setScore(rounds, sf1Id, 1, 0);
      rounds = advanceWinner(rounds, sf1Id);
      // Play final
      const finalId = rounds[1].matches[0].id;
      rounds = setScore(rounds, finalId, 3, 1);
      const result = advanceWinner(rounds, finalId);
      // Should just return rounds without error — no more rounds to advance to
      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
    });
  });

  describe("draw scenario", () => {
    it("treats draw as home team advances (or handles gracefully)", () => {
      let rounds = seedAndSetupBracket4();
      const m0Id = rounds[0].matches[0].id;
      rounds = setScore(rounds, m0Id, 1, 1);
      // Should not throw — implementation decides draw handling
      expect(() => advanceWinner(rounds, m0Id)).not.toThrow();
    });
  });

  describe("match not found", () => {
    it("returns rounds unchanged for non-existent match ID", () => {
      const rounds = seedAndSetupBracket4();
      const result = advanceWinner(rounds, "nonexistent-id");
      expect(result).toBeDefined();
    });
  });

  describe("match with no score", () => {
    it("returns rounds unchanged when match has no score", () => {
      const rounds = seedAndSetupBracket4();
      const m0Id = rounds[0].matches[0].id;
      const result = advanceWinner(rounds, m0Id);
      // No score set, should not advance
      const finalHome = result[1].matches[0].homeTeamId;
      expect(finalHome).toBeNull();
    });
  });
});

describe("integration scenarios", () => {
  it("full 4-team bracket: generate → seed → play → advance → champion", () => {
    // Generate
    let rounds = generateKnockoutRounds(4);
    expect(rounds).toHaveLength(2);

    // Seed
    rounds = seedBracket(rounds, [
      { teamId: "alpha", groupId: "X" },
      { teamId: "beta", groupId: "Y" },
      { teamId: "gamma", groupId: "X" },
      { teamId: "delta", groupId: "Y" },
    ]);

    // Verify seeding
    const allSeeded = rounds[0].matches
      .flatMap((m) => [m.homeTeamId, m.awayTeamId])
      .filter(Boolean);
    expect(allSeeded).toHaveLength(4);

    // Play SF 1
    const sf0Id = rounds[0].matches[0].id;
    rounds = rounds.map((r) => ({
      ...r,
      matches: r.matches.map((m) =>
        m.id === sf0Id ? { ...m, score: { home: 2, away: 1 } } : { ...m }
      ),
    }));
    rounds = advanceWinner(rounds, sf0Id);
    const sf0Winner = rounds[0].matches[0].homeTeamId; // home won 2-1

    // Play SF 2
    const sf1Id = rounds[0].matches[1].id;
    rounds = rounds.map((r) => ({
      ...r,
      matches: r.matches.map((m) =>
        m.id === sf1Id ? { ...m, score: { home: 0, away: 3 } } : { ...m }
      ),
    }));
    rounds = advanceWinner(rounds, sf1Id);
    const sf1Winner = rounds[0].matches[1].awayTeamId; // away won 0-3

    // Verify final has both winners
    expect(rounds[1].matches[0].homeTeamId).toBe(sf0Winner);
    expect(rounds[1].matches[0].awayTeamId).toBe(sf1Winner);

    // Play Final
    const finalId = rounds[1].matches[0].id;
    rounds = rounds.map((r) => ({
      ...r,
      matches: r.matches.map((m) =>
        m.id === finalId ? { ...m, score: { home: 1, away: 0 } } : { ...m }
      ),
    }));

    // Champion is home team of final
    expect(rounds[1].matches[0].score).toEqual({ home: 1, away: 0 });
    expect(rounds[1].matches[0].homeTeamId).toBe(sf0Winner);
  });

  it("full 8-team bracket flow from start to champion", () => {
    // Generate
    let rounds = generateKnockoutRounds(8);
    expect(rounds).toHaveLength(3);

    // Seed 8 teams from 4 groups
    const teams = [
      { teamId: "A1", groupId: "A" },
      { teamId: "A2", groupId: "A" },
      { teamId: "B1", groupId: "B" },
      { teamId: "B2", groupId: "B" },
      { teamId: "C1", groupId: "C" },
      { teamId: "C2", groupId: "C" },
      { teamId: "D1", groupId: "D" },
      { teamId: "D2", groupId: "D" },
    ];
    rounds = seedBracket(rounds, teams);

    // Verify all 8 teams seeded
    const seeded = rounds[0].matches
      .flatMap((m) => [m.homeTeamId, m.awayTeamId])
      .filter(Boolean);
    expect(seeded).toHaveLength(8);

    // Play all QF matches (home always wins for simplicity)
    for (let i = 0; i < 4; i++) {
      const mId = rounds[0].matches[i].id;
      rounds = rounds.map((r) => ({
        ...r,
        matches: r.matches.map((m) =>
          m.id === mId ? { ...m, score: { home: 2, away: 0 } } : { ...m }
        ),
      }));
      rounds = advanceWinner(rounds, mId);
    }

    // Verify SF has 4 teams
    const sfTeams = rounds[1].matches
      .flatMap((m) => [m.homeTeamId, m.awayTeamId])
      .filter(Boolean);
    expect(sfTeams).toHaveLength(4);

    // Play both SF matches (home always wins)
    for (let i = 0; i < 2; i++) {
      const mId = rounds[1].matches[i].id;
      rounds = rounds.map((r) => ({
        ...r,
        matches: r.matches.map((m) =>
          m.id === mId ? { ...m, score: { home: 1, away: 0 } } : { ...m }
        ),
      }));
      rounds = advanceWinner(rounds, mId);
    }

    // Verify Final has 2 teams
    expect(rounds[2].matches[0].homeTeamId).not.toBeNull();
    expect(rounds[2].matches[0].awayTeamId).not.toBeNull();

    // Play Final
    const finalId = rounds[2].matches[0].id;
    rounds = rounds.map((r) => ({
      ...r,
      matches: r.matches.map((m) =>
        m.id === finalId ? { ...m, score: { home: 3, away: 2 } } : { ...m }
      ),
    }));

    // Champion determined
    expect(rounds[2].matches[0].score).toEqual({ home: 3, away: 2 });
  });

  it("16-team bracket: all rounds advance correctly", () => {
    let rounds = generateKnockoutRounds(16);
    const teams = Array.from({ length: 16 }, (_, i) => ({
      teamId: `t${i + 1}`,
      groupId: String.fromCharCode(65 + Math.floor(i / 2)),
    }));
    rounds = seedBracket(rounds, teams);

    // Play through all rounds
    for (let r = 0; r < rounds.length - 1; r++) {
      for (let i = 0; i < rounds[r].matches.length; i++) {
        const mId = rounds[r].matches[i].id;
        rounds = rounds.map((rd) => ({
          ...rd,
          matches: rd.matches.map((m) =>
            m.id === mId ? { ...m, score: { home: 1, away: 0 } } : { ...m }
          ),
        }));
        rounds = advanceWinner(rounds, mId);
      }
    }

    // Final should have two teams
    expect(rounds[3].matches[0].homeTeamId).not.toBeNull();
    expect(rounds[3].matches[0].awayTeamId).not.toBeNull();
  });

  it("away team wins multiple rounds in sequence", () => {
    let rounds = generateKnockoutRounds(4);
    rounds = seedBracket(rounds, [
      { teamId: "underdog", groupId: "Z" },
      { teamId: "fav1", groupId: "A" },
      { teamId: "fav2", groupId: "B" },
      { teamId: "cinderella", groupId: "Z" },
    ]);

    // Both away teams win their semis
    const sf0Id = rounds[0].matches[0].id;
    const sf1Id = rounds[0].matches[1].id;

    rounds = rounds.map((r) => ({
      ...r,
      matches: r.matches.map((m) =>
        m.id === sf0Id ? { ...m, score: { home: 0, away: 5 } } : { ...m }
      ),
    }));
    rounds = advanceWinner(rounds, sf0Id);

    rounds = rounds.map((r) => ({
      ...r,
      matches: r.matches.map((m) =>
        m.id === sf1Id ? { ...m, score: { home: 1, away: 4 } } : { ...m }
      ),
    }));
    rounds = advanceWinner(rounds, sf1Id);

    // Both away teams should be in final
    expect(rounds[1].matches[0].homeTeamId).toBe(
      rounds[0].matches[0].awayTeamId
    );
    expect(rounds[1].matches[0].awayTeamId).toBe(
      rounds[0].matches[1].awayTeamId
    );
  });

  it("32-team bracket: full tournament playthrough", () => {
    let rounds = generateKnockoutRounds(32);
    const teams = Array.from({ length: 32 }, (_, i) => ({
      teamId: `team-${i + 1}`,
      groupId: String.fromCharCode(65 + Math.floor(i / 4)),
    }));
    rounds = seedBracket(rounds, teams);

    for (let r = 0; r < rounds.length - 1; r++) {
      for (let i = 0; i < rounds[r].matches.length; i++) {
        const mId = rounds[r].matches[i].id;
        rounds = rounds.map((rd) => ({
          ...rd,
          matches: rd.matches.map((m) =>
            m.id === mId ? { ...m, score: { home: 1, away: 0 } } : { ...m }
          ),
        }));
        rounds = advanceWinner(rounds, mId);
      }
    }

    expect(rounds[4].matches[0].homeTeamId).not.toBeNull();
    expect(rounds[4].matches[0].awayTeamId).not.toBeNull();
  });
});

describe("additional edge cases", () => {
  describe("generateKnockoutRounds edge cases", () => {
    it("each round has exactly half the matches of the previous", () => {
      for (const size of [4, 8, 16, 32]) {
        const rounds = generateKnockoutRounds(size);
        for (let i = 1; i < rounds.length; i++) {
          expect(rounds[i].matches.length).toBe(
            rounds[i - 1].matches.length / 2
          );
        }
      }
    });

    it("last round is always Final with 1 match", () => {
      for (const size of [2, 4, 8, 16, 32]) {
        const rounds = generateKnockoutRounds(size);
        const last = rounds[rounds.length - 1];
        expect(last.name).toBe("Finale");
        expect(last.matches).toHaveLength(1);
      }
    });

    it("number of rounds equals log2(bracketSize)", () => {
      for (const size of [2, 4, 8, 16, 32]) {
        const rounds = generateKnockoutRounds(size);
        expect(rounds).toHaveLength(Math.log2(size));
      }
    });

    it("all source descriptions are non-empty strings", () => {
      for (const size of [2, 4, 8, 16, 32]) {
        const rounds = generateKnockoutRounds(size);
        for (const round of rounds) {
          for (const match of round.matches) {
            expect(match.homeSourceDescription.length).toBeGreaterThan(0);
            expect(match.awaySourceDescription.length).toBeGreaterThan(0);
          }
        }
      }
    });

    it("first round source descriptions follow Seed N pattern", () => {
      const rounds = generateKnockoutRounds(16);
      for (let i = 0; i < rounds[0].matches.length; i++) {
        expect(rounds[0].matches[i].homeSourceDescription).toMatch(
          /^Positie \d+$/
        );
        expect(rounds[0].matches[i].awaySourceDescription).toMatch(
          /^Positie \d+$/
        );
      }
    });

    it("later round source descriptions follow Winner ko-N pattern", () => {
      const rounds = generateKnockoutRounds(16);
      for (let r = 1; r < rounds.length; r++) {
        for (const match of rounds[r].matches) {
          expect(match.homeSourceDescription).toMatch(/^Winnaar ko-\d+$/);
          expect(match.awaySourceDescription).toMatch(/^Winnaar ko-\d+$/);
        }
      }
    });

    it("match IDs are sequential ko-1, ko-2, etc.", () => {
      const rounds = generateKnockoutRounds(8);
      const allIds = rounds.flatMap((r) => r.matches.map((m) => m.id));
      for (let i = 0; i < allIds.length; i++) {
        expect(allIds[i]).toBe(`ko-${i + 1}`);
      }
    });

    it("fieldIndex and timeSlot are -1 for all matches", () => {
      const rounds = generateKnockoutRounds(16);
      for (const round of rounds) {
        for (const match of round.matches) {
          expect(match.fieldIndex).toBe(-1);
          expect(match.timeSlot).toBe(-1);
        }
      }
    });
  });

  describe("seedBracket edge cases", () => {
    it("seeding preserves source descriptions", () => {
      const rounds = generateKnockoutRounds(4);
      const teams = [
        { teamId: "a", groupId: "A" },
        { teamId: "b", groupId: "B" },
        { teamId: "c", groupId: "A" },
        { teamId: "d", groupId: "B" },
      ];
      const seeded = seedBracket(rounds, teams);
      expect(seeded[0].matches[0].homeSourceDescription).toBe("Positie 1");
      expect(seeded[0].matches[0].awaySourceDescription).toBe("Positie 2");
      expect(seeded[1].matches[0].homeSourceDescription).toMatch(
        /^Winnaar ko-\d+$/
      );
    });

    it("seeding preserves match IDs", () => {
      const rounds = generateKnockoutRounds(8);
      const teams = Array.from({ length: 8 }, (_, i) => ({
        teamId: `t${i}`,
        groupId: String.fromCharCode(65 + (i % 4)),
      }));
      const seeded = seedBracket(rounds, teams);
      for (let r = 0; r < rounds.length; r++) {
        for (let m = 0; m < rounds[r].matches.length; m++) {
          expect(seeded[r].matches[m].id).toBe(rounds[r].matches[m].id);
        }
      }
    });

    it("seeding preserves round names", () => {
      const rounds = generateKnockoutRounds(8);
      const teams = Array.from({ length: 8 }, (_, i) => ({
        teamId: `t${i}`,
        groupId: String.fromCharCode(65 + (i % 4)),
      }));
      const seeded = seedBracket(rounds, teams);
      for (let r = 0; r < rounds.length; r++) {
        expect(seeded[r].name).toBe(rounds[r].name);
      }
    });

    it("seeding preserves phase and score", () => {
      const rounds = generateKnockoutRounds(4);
      const teams = [
        { teamId: "a", groupId: "A" },
        { teamId: "b", groupId: "B" },
      ];
      const seeded = seedBracket(rounds, teams);
      for (const round of seeded) {
        for (const match of round.matches) {
          expect(match.phase).toBe("knockout");
          expect(match.score).toBeNull();
        }
      }
    });

    it("5 teams from 5 groups: perfect avoidance possible, all unique opponents", () => {
      const rounds = generateKnockoutRounds(8);
      const teams = [
        { teamId: "a1", groupId: "A" },
        { teamId: "b1", groupId: "B" },
        { teamId: "c1", groupId: "C" },
        { teamId: "d1", groupId: "D" },
        { teamId: "e1", groupId: "E" },
      ];
      const seeded = seedBracket(rounds, teams);
      for (const match of seeded[0].matches) {
        if (match.homeTeamId && match.awayTeamId) {
          const homeGroup = teams.find(
            (t) => t.teamId === match.homeTeamId
          )!.groupId;
          const awayGroup = teams.find(
            (t) => t.teamId === match.awayTeamId
          )!.groupId;
          expect(homeGroup).not.toBe(awayGroup);
        }
      }
    });

    it("8 teams from 2 groups: minimizes same-group clashes", () => {
      const rounds = generateKnockoutRounds(8);
      const teams = [
        { teamId: "a1", groupId: "A" },
        { teamId: "a2", groupId: "A" },
        { teamId: "a3", groupId: "A" },
        { teamId: "a4", groupId: "A" },
        { teamId: "b1", groupId: "B" },
        { teamId: "b2", groupId: "B" },
        { teamId: "b3", groupId: "B" },
        { teamId: "b4", groupId: "B" },
      ];
      const seeded = seedBracket(rounds, teams);
      let clashes = 0;
      for (const match of seeded[0].matches) {
        if (match.homeTeamId && match.awayTeamId) {
          const homeGroup = teams.find(
            (t) => t.teamId === match.homeTeamId
          )!.groupId;
          const awayGroup = teams.find(
            (t) => t.teamId === match.awayTeamId
          )!.groupId;
          if (homeGroup === awayGroup) clashes++;
        }
      }
      // With 4A + 4B in 4 matches, perfect avoidance IS possible (0 clashes)
      expect(clashes).toBe(0);
    });
  });

  describe("advanceWinner edge cases", () => {
    it("advancing same match twice overwrites the slot", () => {
      let rounds = generateKnockoutRounds(4);
      rounds = seedBracket(rounds, [
        { teamId: "a", groupId: "A" },
        { teamId: "b", groupId: "B" },
        { teamId: "c", groupId: "A" },
        { teamId: "d", groupId: "B" },
      ]);
      const m0Id = rounds[0].matches[0].id;

      // First: home wins
      rounds = rounds.map((r) => ({
        ...r,
        matches: r.matches.map((m) =>
          m.id === m0Id ? { ...m, score: { home: 3, away: 0 } } : { ...m }
        ),
      }));
      rounds = advanceWinner(rounds, m0Id);
      const firstWinner = rounds[1].matches[0].homeTeamId;

      // Change score: away wins
      rounds = rounds.map((r) => ({
        ...r,
        matches: r.matches.map((m) =>
          m.id === m0Id ? { ...m, score: { home: 0, away: 3 } } : { ...m }
        ),
      }));
      rounds = advanceWinner(rounds, m0Id);
      const secondWinner = rounds[1].matches[0].homeTeamId;

      expect(firstWinner).not.toBe(secondWinner);
    });

    it("high scoring match advances winner correctly", () => {
      let rounds = generateKnockoutRounds(4);
      rounds = seedBracket(rounds, [
        { teamId: "a", groupId: "A" },
        { teamId: "b", groupId: "B" },
        { teamId: "c", groupId: "C" },
        { teamId: "d", groupId: "D" },
      ]);
      const m0Id = rounds[0].matches[0].id;
      rounds = rounds.map((r) => ({
        ...r,
        matches: r.matches.map((m) =>
          m.id === m0Id ? { ...m, score: { home: 99, away: 98 } } : { ...m }
        ),
      }));
      const advanced = advanceWinner(rounds, m0Id);
      expect(advanced[1].matches[0].homeTeamId).toBe(
        rounds[0].matches[0].homeTeamId
      );
    });

    it("score 0-0 draw: home team advances as tiebreak", () => {
      let rounds = generateKnockoutRounds(4);
      rounds = seedBracket(rounds, [
        { teamId: "a", groupId: "A" },
        { teamId: "b", groupId: "B" },
        { teamId: "c", groupId: "C" },
        { teamId: "d", groupId: "D" },
      ]);
      const m0Id = rounds[0].matches[0].id;
      rounds = rounds.map((r) => ({
        ...r,
        matches: r.matches.map((m) =>
          m.id === m0Id ? { ...m, score: { home: 0, away: 0 } } : { ...m }
        ),
      }));
      const advanced = advanceWinner(rounds, m0Id);
      expect(advanced[1].matches[0].homeTeamId).toBe(
        rounds[0].matches[0].homeTeamId
      );
    });

    it("advancing does not affect other matches in the same round", () => {
      let rounds = generateKnockoutRounds(8);
      rounds = seedBracket(
        rounds,
        Array.from({ length: 8 }, (_, i) => ({
          teamId: `t${i}`,
          groupId: String.fromCharCode(65 + (i % 4)),
        }))
      );

      const m0Id = rounds[0].matches[0].id;
      const originalM1 = { ...rounds[0].matches[1] };

      rounds = rounds.map((r) => ({
        ...r,
        matches: r.matches.map((m) =>
          m.id === m0Id ? { ...m, score: { home: 1, away: 0 } } : { ...m }
        ),
      }));
      const advanced = advanceWinner(rounds, m0Id);

      expect(advanced[0].matches[1].homeTeamId).toBe(originalM1.homeTeamId);
      expect(advanced[0].matches[1].awayTeamId).toBe(originalM1.awayTeamId);
      expect(advanced[0].matches[1].score).toEqual(originalM1.score);
    });

    it("advancing does not modify earlier rounds", () => {
      let rounds = generateKnockoutRounds(8);
      rounds = seedBracket(
        rounds,
        Array.from({ length: 8 }, (_, i) => ({
          teamId: `t${i}`,
          groupId: String.fromCharCode(65 + (i % 4)),
        }))
      );

      // Play all QF
      for (let i = 0; i < 4; i++) {
        const mId = rounds[0].matches[i].id;
        rounds = rounds.map((r) => ({
          ...r,
          matches: r.matches.map((m) =>
            m.id === mId ? { ...m, score: { home: 1, away: 0 } } : { ...m }
          ),
        }));
        rounds = advanceWinner(rounds, mId);
      }

      const qfSnapshot = JSON.parse(JSON.stringify(rounds[0]));

      // Play SF
      const sfId = rounds[1].matches[0].id;
      rounds = rounds.map((r) => ({
        ...r,
        matches: r.matches.map((m) =>
          m.id === sfId ? { ...m, score: { home: 2, away: 1 } } : { ...m }
        ),
      }));
      const advanced = advanceWinner(rounds, sfId);

      // QF round should be unchanged
      expect(advanced[0]).toEqual(qfSnapshot);
    });
  });
});
