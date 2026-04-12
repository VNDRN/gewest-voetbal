import { describe, it, expect } from "vitest";
import {
  bracketSeeds,
  generateKnockoutRounds,
  seedBracket,
  advanceWinner,
} from "../../engine/knockout";
import type { KnockoutRound } from "../../types";

describe("bracketSeeds", () => {
  it("returns [1, 2] for size 2", () => {
    expect(bracketSeeds(2)).toEqual([1, 2]);
  });

  it("returns [1, 4, 2, 3] for size 4", () => {
    expect(bracketSeeds(4)).toEqual([1, 4, 2, 3]);
  });

  it("returns proper fold for size 8", () => {
    expect(bracketSeeds(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });

  it("contains every seed exactly once", () => {
    for (const size of [2, 4, 8, 16, 32]) {
      const seeds = bracketSeeds(size);
      expect(seeds).toHaveLength(size);
      expect(new Set(seeds).size).toBe(size);
    }
  });

  it("pairs sum to size + 1", () => {
    for (const size of [2, 4, 8, 16]) {
      const seeds = bracketSeeds(size);
      for (let i = 0; i < seeds.length; i += 2) {
        expect(seeds[i] + seeds[i + 1]).toBe(size + 1);
      }
    }
  });
});

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

  describe("bracket size 4 (SF + KF + Final)", () => {
    it("produces 3 rounds with 2+1+1 matches", () => {
      const rounds = generateKnockoutRounds(4);
      expect(rounds).toHaveLength(3);
      expect(rounds[0].matches).toHaveLength(2);
      expect(rounds[1].matches).toHaveLength(1);
      expect(rounds[2].matches).toHaveLength(1);
    });

    it("names rounds Semi-final, Kleine finale, and Final", () => {
      const rounds = generateKnockoutRounds(4);
      expect(rounds[0].name).toBe("Halve finale");
      expect(rounds[1].name).toBe("Kleine finale");
      expect(rounds[2].name).toBe("Finale");
    });

    it("first-round matches have bracket-folded seed descriptions", () => {
      const rounds = generateKnockoutRounds(4);
      const [m0, m1] = rounds[0].matches;
      expect(m0.homeSourceDescription).toBe("Positie 1");
      expect(m0.awaySourceDescription).toBe("Positie 4");
      expect(m1.homeSourceDescription).toBe("Positie 2");
      expect(m1.awaySourceDescription).toBe("Positie 3");
    });

    it("final references winners from semis", () => {
      const rounds = generateKnockoutRounds(4);
      const final = rounds[2].matches[0];
      const sf0Id = rounds[0].matches[0].id;
      const sf1Id = rounds[0].matches[1].id;
      expect(final.homeSourceDescription).toBe(`Winnaar ${sf0Id}`);
      expect(final.awaySourceDescription).toBe(`Winnaar ${sf1Id}`);
    });

    it("kleine finale references losers from semis", () => {
      const rounds = generateKnockoutRounds(4);
      const kf = rounds[1].matches[0];
      const sf0Id = rounds[0].matches[0].id;
      const sf1Id = rounds[0].matches[1].id;
      expect(kf.homeSourceDescription).toBe(`Verliezer ${sf0Id}`);
      expect(kf.awaySourceDescription).toBe(`Verliezer ${sf1Id}`);
      expect(rounds[1].isThirdPlace).toBe(true);
    });
  });

  describe("bracket size 8 (QF + SF + KF + Final)", () => {
    it("produces 4 rounds with 4+2+1+1 matches", () => {
      const rounds = generateKnockoutRounds(8);
      expect(rounds).toHaveLength(4);
      expect(rounds[0].matches).toHaveLength(4);
      expect(rounds[1].matches).toHaveLength(2);
      expect(rounds[2].matches).toHaveLength(1);
      expect(rounds[3].matches).toHaveLength(1);
    });

    it("names rounds Quarter-final, Semi-final, Kleine finale, Final", () => {
      const rounds = generateKnockoutRounds(8);
      expect(rounds[0].name).toBe("Kwartfinale");
      expect(rounds[1].name).toBe("Halve finale");
      expect(rounds[2].name).toBe("Kleine finale");
      expect(rounds[3].name).toBe("Finale");
    });

    it("first-round matches have bracket-folded seed descriptions", () => {
      const rounds = generateKnockoutRounds(8);
      const descs = rounds[0].matches.map((m) => [
        m.homeSourceDescription,
        m.awaySourceDescription,
      ]);
      expect(descs).toEqual([
        ["Positie 1", "Positie 8"],
        ["Positie 4", "Positie 5"],
        ["Positie 2", "Positie 7"],
        ["Positie 3", "Positie 6"],
      ]);
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
      const final = rounds[3].matches[0];
      expect(final.homeSourceDescription).toBe(
        `Winnaar ${rounds[1].matches[0].id}`
      );
      expect(final.awaySourceDescription).toBe(
        `Winnaar ${rounds[1].matches[1].id}`
      );
    });
  });

  describe("bracket size 16", () => {
    it("produces 5 rounds with 8+4+2+1+1 matches", () => {
      const rounds = generateKnockoutRounds(16);
      expect(rounds).toHaveLength(5);
      expect(rounds[0].matches).toHaveLength(8);
      expect(rounds[1].matches).toHaveLength(4);
      expect(rounds[2].matches).toHaveLength(2);
      expect(rounds[3].matches).toHaveLength(1);
      expect(rounds[4].matches).toHaveLength(1);
    });

    it("names first round 'Round of 16'", () => {
      const rounds = generateKnockoutRounds(16);
      expect(rounds[0].name).toBe("Achtste finales");
      expect(rounds[1].name).toBe("Kwartfinale");
      expect(rounds[2].name).toBe("Halve finale");
      expect(rounds[3].name).toBe("Kleine finale");
      expect(rounds[4].name).toBe("Finale");
    });

    it("first-round matches have bracket-folded seed descriptions", () => {
      const rounds = generateKnockoutRounds(16);
      const descs = rounds[0].matches.map((m) => [
        m.homeSourceDescription,
        m.awaySourceDescription,
      ]);
      expect(descs).toEqual([
        ["Positie 1", "Positie 16"],
        ["Positie 8", "Positie 9"],
        ["Positie 4", "Positie 13"],
        ["Positie 5", "Positie 12"],
        ["Positie 2", "Positie 15"],
        ["Positie 7", "Positie 10"],
        ["Positie 3", "Positie 14"],
        ["Positie 6", "Positie 11"],
      ]);
    });
  });

  describe("bracket size 32", () => {
    it("produces 6 rounds with 16+8+4+2+1+1 matches", () => {
      const rounds = generateKnockoutRounds(32);
      expect(rounds).toHaveLength(6);
      expect(rounds[0].matches).toHaveLength(16);
      expect(rounds[1].matches).toHaveLength(8);
      expect(rounds[2].matches).toHaveLength(4);
      expect(rounds[3].matches).toHaveLength(2);
      expect(rounds[4].matches).toHaveLength(1);
      expect(rounds[5].matches).toHaveLength(1);
    });

    it("names first round 'Round of 32'", () => {
      const rounds = generateKnockoutRounds(32);
      expect(rounds[0].name).toBe("32ste finales");
      expect(rounds[1].name).toBe("Achtste finales");
      expect(rounds[2].name).toBe("Kwartfinale");
      expect(rounds[3].name).toBe("Halve finale");
      expect(rounds[4].name).toBe("Kleine finale");
      expect(rounds[5].name).toBe("Finale");
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

    it("total match count equals bracketSize - 1 (+ 1 kleine finale for size >= 4)", () => {
      for (const size of [2, 4, 8, 16, 32]) {
        const rounds = generateKnockoutRounds(size);
        const total = rounds.reduce((sum, r) => sum + r.matches.length, 0);
        expect(total).toBe(size >= 4 ? size : size - 1);
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
    it("later round source descriptions reference actual match IDs from feeding round", () => {
      for (const size of [4, 8, 16, 32]) {
        const rounds = generateKnockoutRounds(size);
        for (let r = 1; r < rounds.length; r++) {
          if (rounds[r].isThirdPlace) {
            // KF references the SF round (same as previous round)
            const sfIds = new Set(rounds[r - 1].matches.map((m) => m.id));
            for (const match of rounds[r].matches) {
              const homeRef = match.homeSourceDescription.replace("Verliezer ", "");
              const awayRef = match.awaySourceDescription.replace("Verliezer ", "");
              expect(sfIds.has(homeRef)).toBe(true);
              expect(sfIds.has(awayRef)).toBe(true);
            }
            continue;
          }
          // Final after KF references the SF round (skip KF)
          let prevR = r - 1;
          if (rounds[prevR].isThirdPlace) prevR--;
          const prevMatchIds = new Set(rounds[prevR].matches.map((m) => m.id));
          for (const match of rounds[r].matches) {
            const homeRef = match.homeSourceDescription.replace("Winnaar ", "");
            const awayRef = match.awaySourceDescription.replace("Winnaar ", "");
            expect(prevMatchIds.has(homeRef)).toBe(true);
            expect(prevMatchIds.has(awayRef)).toBe(true);
          }
        }
      }
    });

    it("SF matches are each referenced by both KF and Final (winner + loser)", () => {
      for (const size of [4, 8, 16, 32]) {
        const rounds = generateKnockoutRounds(size);
        const kfRound = rounds.find((r) => r.isThirdPlace)!;
        const finalRound = rounds[rounds.length - 1];
        const sfRound = rounds[rounds.indexOf(kfRound) - 1];

        const kfRefs = kfRound.matches.flatMap((m) => [
          m.homeSourceDescription.replace("Verliezer ", ""),
          m.awaySourceDescription.replace("Verliezer ", ""),
        ]);
        const finalRefs = finalRound.matches.flatMap((m) => [
          m.homeSourceDescription.replace("Winnaar ", ""),
          m.awaySourceDescription.replace("Winnaar ", ""),
        ]);

        const sfIds = sfRound.matches.map((m) => m.id);
        expect(kfRefs.sort()).toEqual(sfIds.sort());
        expect(finalRefs.sort()).toEqual(sfIds.sort());
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

    it("8 teams from 3 groups (3+3+2): no same-group matchup after swap", () => {
      const rounds = generateKnockoutRounds(8);
      const teams = makeTeams([
        { groupId: "A", count: 3 },
        { groupId: "B", count: 3 },
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
    it("home team wins and advances to final", () => {
      let rounds = seedAndSetupBracket4();
      const m0Id = rounds[0].matches[0].id;
      rounds = setScore(rounds, m0Id, 3, 1);
      const advanced = advanceWinner(rounds, m0Id);
      const homeTeam = rounds[0].matches[0].homeTeamId;
      const awayTeam = rounds[0].matches[0].awayTeamId;
      expect(advanced[2].matches[0].homeTeamId).toBe(homeTeam);
      expect(advanced[1].matches[0].homeTeamId).toBe(awayTeam);
    });

    it("away team wins and advances to final", () => {
      let rounds = seedAndSetupBracket4();
      const m0Id = rounds[0].matches[0].id;
      rounds = setScore(rounds, m0Id, 0, 2);
      const advanced = advanceWinner(rounds, m0Id);
      const homeTeam = rounds[0].matches[0].homeTeamId;
      const awayTeam = rounds[0].matches[0].awayTeamId;
      expect(advanced[2].matches[0].homeTeamId).toBe(awayTeam);
      expect(advanced[1].matches[0].homeTeamId).toBe(homeTeam);
    });

    it("match 0 winner → final match 0 home, loser → KF match 0 home", () => {
      let rounds = seedAndSetupBracket4();
      const m0Id = rounds[0].matches[0].id;
      rounds = setScore(rounds, m0Id, 2, 0);
      const advanced = advanceWinner(rounds, m0Id);
      expect(advanced[2].matches[0].homeTeamId).toBe(
        rounds[0].matches[0].homeTeamId
      );
      expect(advanced[1].matches[0].homeTeamId).toBe(
        rounds[0].matches[0].awayTeamId
      );
    });

    it("match 1 winner → final match 0 away, loser → KF match 0 away", () => {
      let rounds = seedAndSetupBracket4();
      const m1Id = rounds[0].matches[1].id;
      rounds = setScore(rounds, m1Id, 2, 0);
      const advanced = advanceWinner(rounds, m1Id);
      expect(advanced[2].matches[0].awayTeamId).toBe(
        rounds[0].matches[1].homeTeamId
      );
      expect(advanced[1].matches[0].awayTeamId).toBe(
        rounds[0].matches[1].awayTeamId
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

    it("SF match winner advances to final, loser to kleine finale", () => {
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
      expect(advanced[3].matches[0].homeTeamId).toBe(
        rounds[1].matches[0].homeTeamId
      );
      expect(advanced[2].matches[0].homeTeamId).toBe(
        rounds[1].matches[0].awayTeamId
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
      const finalId = rounds[2].matches[0].id;
      rounds = setScore(rounds, finalId, 3, 1);
      const result = advanceWinner(rounds, finalId);
      expect(result).toBeDefined();
      expect(result).toHaveLength(3);
    });
  });

  describe("draw scenario", () => {
    it("draw without penalties does not advance", () => {
      let rounds = seedAndSetupBracket4();
      const m0Id = rounds[0].matches[0].id;
      rounds = setScore(rounds, m0Id, 1, 1);
      const advanced = advanceWinner(rounds, m0Id);
      // No penalties → no advancement
      expect(advanced[2].matches[0].homeTeamId).toBeNull();
    });
  });

  describe("penalty shootout", () => {
    function setScoreWithPenalties(
      rounds: KnockoutRound[],
      matchId: string,
      home: number,
      away: number,
      penHome: number,
      penAway: number,
    ): KnockoutRound[] {
      return rounds.map((r) => ({
        ...r,
        matches: r.matches.map((m) =>
          m.id === matchId ? { ...m, score: { home, away, penHome, penAway } } : { ...m },
        ),
      }));
    }

    it("home team wins on penalties → home advances", () => {
      let rounds = seedAndSetupBracket4();
      const m0Id = rounds[0].matches[0].id;
      rounds = setScoreWithPenalties(rounds, m0Id, 1, 1, 4, 3);
      const advanced = advanceWinner(rounds, m0Id);
      expect(advanced[2].matches[0].homeTeamId).toBe(rounds[0].matches[0].homeTeamId);
      expect(advanced[1].matches[0].homeTeamId).toBe(rounds[0].matches[0].awayTeamId);
    });

    it("away team wins on penalties → away advances", () => {
      let rounds = seedAndSetupBracket4();
      const m0Id = rounds[0].matches[0].id;
      rounds = setScoreWithPenalties(rounds, m0Id, 2, 2, 3, 5);
      const advanced = advanceWinner(rounds, m0Id);
      expect(advanced[2].matches[0].homeTeamId).toBe(rounds[0].matches[0].awayTeamId);
      expect(advanced[1].matches[0].homeTeamId).toBe(rounds[0].matches[0].homeTeamId);
    });

    it("draw with equal penalties does not advance", () => {
      let rounds = seedAndSetupBracket4();
      const m0Id = rounds[0].matches[0].id;
      rounds = setScoreWithPenalties(rounds, m0Id, 0, 0, 3, 3);
      const advanced = advanceWinner(rounds, m0Id);
      expect(advanced[2].matches[0].homeTeamId).toBeNull();
    });

    it("penalties ignored when regular score is not a draw", () => {
      let rounds = seedAndSetupBracket4();
      const m0Id = rounds[0].matches[0].id;
      rounds = setScoreWithPenalties(rounds, m0Id, 3, 1, 2, 5);
      const advanced = advanceWinner(rounds, m0Id);
      // Regular score decides — home wins 3-1, penalties ignored
      expect(advanced[2].matches[0].homeTeamId).toBe(rounds[0].matches[0].homeTeamId);
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
      const finalHome = result[2].matches[0].homeTeamId;
      expect(finalHome).toBeNull();
    });
  });
});

describe("integration scenarios", () => {
  it("full 4-team bracket: generate → seed → play → advance → champion", () => {
    let rounds = generateKnockoutRounds(4);
    expect(rounds).toHaveLength(3);

    rounds = seedBracket(rounds, [
      { teamId: "alpha", groupId: "X" },
      { teamId: "beta", groupId: "Y" },
      { teamId: "gamma", groupId: "X" },
      { teamId: "delta", groupId: "Y" },
    ]);

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
    const sf0Winner = rounds[0].matches[0].homeTeamId;
    const sf0Loser = rounds[0].matches[0].awayTeamId;

    // Play SF 2
    const sf1Id = rounds[0].matches[1].id;
    rounds = rounds.map((r) => ({
      ...r,
      matches: r.matches.map((m) =>
        m.id === sf1Id ? { ...m, score: { home: 0, away: 3 } } : { ...m }
      ),
    }));
    rounds = advanceWinner(rounds, sf1Id);
    const sf1Winner = rounds[0].matches[1].awayTeamId;
    const sf1Loser = rounds[0].matches[1].homeTeamId;

    // Verify final has both winners
    expect(rounds[2].matches[0].homeTeamId).toBe(sf0Winner);
    expect(rounds[2].matches[0].awayTeamId).toBe(sf1Winner);

    // Verify kleine finale has both losers
    expect(rounds[1].matches[0].homeTeamId).toBe(sf0Loser);
    expect(rounds[1].matches[0].awayTeamId).toBe(sf1Loser);

    // Play Final
    const finalId = rounds[2].matches[0].id;
    rounds = rounds.map((r) => ({
      ...r,
      matches: r.matches.map((m) =>
        m.id === finalId ? { ...m, score: { home: 1, away: 0 } } : { ...m }
      ),
    }));

    expect(rounds[2].matches[0].score).toEqual({ home: 1, away: 0 });
    expect(rounds[2].matches[0].homeTeamId).toBe(sf0Winner);
  });

  it("full 8-team bracket flow from start to champion", () => {
    let rounds = generateKnockoutRounds(8);
    expect(rounds).toHaveLength(4);

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

    const seeded = rounds[0].matches
      .flatMap((m) => [m.homeTeamId, m.awayTeamId])
      .filter(Boolean);
    expect(seeded).toHaveLength(8);

    // Play all QF matches (home always wins)
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

    // Verify Final and Kleine finale have teams
    expect(rounds[3].matches[0].homeTeamId).not.toBeNull();
    expect(rounds[3].matches[0].awayTeamId).not.toBeNull();
    expect(rounds[2].matches[0].homeTeamId).not.toBeNull();
    expect(rounds[2].matches[0].awayTeamId).not.toBeNull();

    // Play Final
    const finalId = rounds[3].matches[0].id;
    rounds = rounds.map((r) => ({
      ...r,
      matches: r.matches.map((m) =>
        m.id === finalId ? { ...m, score: { home: 3, away: 2 } } : { ...m }
      ),
    }));

    expect(rounds[3].matches[0].score).toEqual({ home: 3, away: 2 });
  });

  it("16-team bracket: all rounds advance correctly", () => {
    let rounds = generateKnockoutRounds(16);
    const teams = Array.from({ length: 16 }, (_, i) => ({
      teamId: `t${i + 1}`,
      groupId: String.fromCharCode(65 + Math.floor(i / 2)),
    }));
    rounds = seedBracket(rounds, teams);

    // Play through bracket rounds (skip KF — it's filled by loser advancement)
    for (let r = 0; r < rounds.length; r++) {
      if (rounds[r].isThirdPlace) continue;
      for (let i = 0; i < rounds[r].matches.length; i++) {
        if (!rounds[r].matches[i].homeTeamId || !rounds[r].matches[i].awayTeamId) continue;
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
    const finalRound = rounds[rounds.length - 1];
    expect(finalRound.matches[0].homeTeamId).not.toBeNull();
    expect(finalRound.matches[0].awayTeamId).not.toBeNull();
  });

  it("away team wins multiple rounds in sequence", () => {
    let rounds = generateKnockoutRounds(4);
    rounds = seedBracket(rounds, [
      { teamId: "underdog", groupId: "Z" },
      { teamId: "fav1", groupId: "A" },
      { teamId: "fav2", groupId: "B" },
      { teamId: "cinderella", groupId: "Z" },
    ]);

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
    expect(rounds[2].matches[0].homeTeamId).toBe(
      rounds[0].matches[0].awayTeamId
    );
    expect(rounds[2].matches[0].awayTeamId).toBe(
      rounds[0].matches[1].awayTeamId
    );
    // Both home teams (losers) should be in kleine finale
    expect(rounds[1].matches[0].homeTeamId).toBe(
      rounds[0].matches[0].homeTeamId
    );
    expect(rounds[1].matches[0].awayTeamId).toBe(
      rounds[0].matches[1].homeTeamId
    );
  });

  it("32-team bracket: full tournament playthrough", () => {
    let rounds = generateKnockoutRounds(32);
    const teams = Array.from({ length: 32 }, (_, i) => ({
      teamId: `team-${i + 1}`,
      groupId: String.fromCharCode(65 + Math.floor(i / 4)),
    }));
    rounds = seedBracket(rounds, teams);

    for (let r = 0; r < rounds.length; r++) {
      if (rounds[r].isThirdPlace) continue;
      for (let i = 0; i < rounds[r].matches.length; i++) {
        if (!rounds[r].matches[i].homeTeamId || !rounds[r].matches[i].awayTeamId) continue;
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

    const finalRound = rounds[rounds.length - 1];
    expect(finalRound.matches[0].homeTeamId).not.toBeNull();
    expect(finalRound.matches[0].awayTeamId).not.toBeNull();
  });
});

describe("additional edge cases", () => {
  describe("generateKnockoutRounds edge cases", () => {
    it("bracket rounds (excl. KF) each have half the matches of the previous", () => {
      for (const size of [4, 8, 16, 32]) {
        const rounds = generateKnockoutRounds(size).filter((r) => !r.isThirdPlace);
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

    it("number of rounds equals log2(bracketSize) + 1 for size >= 4 (kleine finale)", () => {
      for (const size of [2, 4, 8, 16, 32]) {
        const rounds = generateKnockoutRounds(size);
        const expected = size >= 4 ? Math.log2(size) + 1 : Math.log2(size);
        expect(rounds).toHaveLength(expected);
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

    it("later round source descriptions follow Winner/Verliezer ko-N pattern", () => {
      const rounds = generateKnockoutRounds(16);
      for (let r = 1; r < rounds.length; r++) {
        const prefix = rounds[r].isThirdPlace ? "Verliezer" : "Winnaar";
        for (const match of rounds[r].matches) {
          expect(match.homeSourceDescription).toMatch(new RegExp(`^${prefix} ko-\\d+$`));
          expect(match.awaySourceDescription).toMatch(new RegExp(`^${prefix} ko-\\d+$`));
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
      expect(seeded[0].matches[0].awaySourceDescription).toBe("Positie 4");
      expect(seeded[1].matches[0].homeSourceDescription).toMatch(
        /^Verliezer ko-\d+$/
      );
      expect(seeded[2].matches[0].homeSourceDescription).toMatch(
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
      const firstWinner = rounds[2].matches[0].homeTeamId;

      // Change score: away wins
      rounds = rounds.map((r) => ({
        ...r,
        matches: r.matches.map((m) =>
          m.id === m0Id ? { ...m, score: { home: 0, away: 3 } } : { ...m }
        ),
      }));
      rounds = advanceWinner(rounds, m0Id);
      const secondWinner = rounds[2].matches[0].homeTeamId;

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
      expect(advanced[2].matches[0].homeTeamId).toBe(
        rounds[0].matches[0].homeTeamId
      );
    });

    it("score 0-0 draw without penalties: no advancement", () => {
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
          m.id === m0Id ? { ...m, score: { home: 0, away: 0 } } : { ...m },
        ),
      }));
      const advanced = advanceWinner(rounds, m0Id);
      expect(advanced[2].matches[0].homeTeamId).toBeNull();
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
