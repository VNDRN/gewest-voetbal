import { describe, it, expect } from "vitest";
import { scheduledMatchMeta } from "../../components/ScheduleGrid";
import type { ScheduledMatch } from "../../types";

function makeMatch(partial: Partial<ScheduledMatch> = {}): ScheduledMatch {
  return {
    id: "m1",
    homeTeamId: "t1",
    awayTeamId: "t2",
    fieldIndex: 0,
    timeSlot: 0,
    score: null,
    phase: "group",
    competitionId: "mens",
    groupName: "Groep A",
    ...partial,
  };
}

describe("scheduledMatchMeta", () => {
  it("labels a men's group match with comp + group short", () => {
    expect(scheduledMatchMeta(makeMatch())).toEqual({
      pillLabel: "Heren · A",
      rightEyebrow: "Groep",
      pillVariant: "heren",
    });
  });

  it("labels a women's group match with dames variant", () => {
    const meta = scheduledMatchMeta(
      makeMatch({ competitionId: "womens", groupName: "Groep B" })
    );
    expect(meta).toEqual({
      pillLabel: "Dames · B",
      rightEyebrow: "Groep",
      pillVariant: "dames",
    });
  });

  it("labels a knockout match with competition in pill and round name eyebrow", () => {
    const meta = scheduledMatchMeta(
      makeMatch({ phase: "knockout", groupName: "Halve finale" })
    );
    expect(meta).toEqual({
      pillLabel: "Heren",
      rightEyebrow: "Halve finale",
      pillVariant: "heren",
    });
  });

  it("labels a women's knockout final with dames variant", () => {
    const meta = scheduledMatchMeta(
      makeMatch({
        phase: "knockout",
        competitionId: "womens",
        groupName: "Finale",
      })
    );
    expect(meta).toEqual({
      pillLabel: "Dames",
      rightEyebrow: "Finale",
      pillVariant: "dames",
    });
  });

  it("falls back to full groupName when it has no space", () => {
    const meta = scheduledMatchMeta(makeMatch({ groupName: "A" }));
    expect(meta.pillLabel).toBe("Heren · A");
  });
});
