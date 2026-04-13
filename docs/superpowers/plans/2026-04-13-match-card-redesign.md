# Match Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the match cell inside `ScheduleGrid` to match the Chiro-branded app — color-coded competition pill, display-font score, single `home — score — away` row with 16px gap between header and teams row.

**Architecture:** One-file change to `src/components/ScheduleGrid.tsx`. Extract a small `scheduledMatchMeta(match)` helper (co-located in the same file) that computes the pill label, right-eyebrow label, and pill variant from a `ScheduledMatch`. Replace the inline cell JSX (the `inner` fragment and its surrounding button/div) with the new layout. No prop changes, no new files, no data changes.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4 (theme tokens in `src/index.css`), Vite, Vitest + jsdom for tests.

**Issue:** [#23](https://github.com/VNDRN/football-tournament/issues/23)
**Spec:** `docs/superpowers/specs/2026-04-13-match-card-redesign-design.md`

---

## Task 1: Add unit test for `scheduledMatchMeta` helper

**Files:**
- Test: `src/__tests__/components/ScheduleGrid.meta.test.ts` (new)

The helper is co-located in `ScheduleGrid.tsx` but exported for tests. It turns a `ScheduledMatch` into `{ pillLabel, rightEyebrow, pillVariant }`. Rules:

- `pillVariant`: `"dames"` if `competitionId === "womens"`, else `"heren"`.
- Group matches (`phase === "group"`):
  - `pillLabel`: `` `${competitionLabel} · ${groupShort}` `` where `competitionLabel = variant === "dames" ? "Dames" : "Heren"` and `groupShort = match.groupName.split(" ").pop() ?? match.groupName`.
  - `rightEyebrow`: `"Groep"`.
- Knockout matches (`phase === "knockout"`):
  - `pillLabel`: `match.groupName` (e.g. `"Halve finale"`).
  - `rightEyebrow`: `competitionLabel`.

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/components/ScheduleGrid.meta.test.ts
import { describe, it, expect } from "vitest";
import { scheduledMatchMeta } from "../../components/ScheduleGrid";
import type { ScheduledMatch } from "../../components/ScheduleGrid";

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

  it("labels a knockout match with round name and competition eyebrow", () => {
    const meta = scheduledMatchMeta(
      makeMatch({ phase: "knockout", groupName: "Halve finale" })
    );
    expect(meta).toEqual({
      pillLabel: "Halve finale",
      rightEyebrow: "Heren",
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
      pillLabel: "Finale",
      rightEyebrow: "Dames",
      pillVariant: "dames",
    });
  });

  it("falls back to full groupName when it has no space", () => {
    const meta = scheduledMatchMeta(makeMatch({ groupName: "A" }));
    expect(meta.pillLabel).toBe("Heren · A");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/__tests__/components/ScheduleGrid.meta.test.ts`
Expected: FAIL with `scheduledMatchMeta is not exported from "../../components/ScheduleGrid"` (or similar import error).

- [ ] **Step 3: Implement `scheduledMatchMeta` and export it**

Open `src/components/ScheduleGrid.tsx`. At the top of the file, just below the existing `type Props = { … }` block (around line 30) and **before** the `export default function ScheduleGrid(...)`, add:

```tsx
export type MatchPillVariant = "heren" | "dames";

export type MatchMeta = {
  pillLabel: string;
  rightEyebrow: string;
  pillVariant: MatchPillVariant;
};

export function scheduledMatchMeta(match: ScheduledMatch): MatchMeta {
  const pillVariant: MatchPillVariant =
    match.competitionId === "womens" ? "dames" : "heren";
  const competitionLabel = pillVariant === "dames" ? "Dames" : "Heren";

  if (match.phase === "knockout") {
    return {
      pillLabel: match.groupName,
      rightEyebrow: competitionLabel,
      pillVariant,
    };
  }

  const groupShort =
    match.groupName.split(" ").pop() ?? match.groupName;
  return {
    pillLabel: `${competitionLabel} · ${groupShort}`,
    rightEyebrow: "Groep",
    pillVariant,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/__tests__/components/ScheduleGrid.meta.test.ts`
Expected: PASS — 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/ScheduleGrid.tsx src/__tests__/components/ScheduleGrid.meta.test.ts
git commit -m "feat(schedule): add scheduledMatchMeta helper for card redesign"
```

---

## Task 2: Replace cell JSX with the redesigned card

**Files:**
- Modify: `src/components/ScheduleGrid.tsx` (cell render block, currently lines ~92-164)

This task swaps the inline card body (the `inner` fragment and its surrounding `button`/`div` wrapper) for the new Option D layout. The outer `<td>` stays but tightens from `px-2 py-1.5` to `p-1` so the card's own padding handles breathing room.

- [ ] **Step 1: Replace the cell render block**

In `src/components/ScheduleGrid.tsx`, find the block starting with the comment-free lines:

```tsx
                    const isWomens = match.competitionId === "womens";
                    const badgeClass = isWomens
                      ? "bg-brand/10 text-brand"
                      : "bg-ink/10 text-ink";
                    const isKnockout = match.phase === "knockout";
                    const homeName = match.homeTeamId
                      ? (teamNames.get(match.homeTeamId) ?? "?")
                      : (match.homeSourceDescription ?? "TBD");
                    const awayName = match.awayTeamId
                      ? (teamNames.get(match.awayTeamId) ?? "?")
                      : (match.awaySourceDescription ?? "TBD");
```

...and ending after the closing `);` of the `return` inside the `Array.from({ length: fieldCount }, (_, field) => { ... })` map (i.e. everything up to and including the line `);` that closes the `(_, field) =>` callback's `return`). Replace the entire `const isWomens = …` through the final `return (` …`)` block with:

```tsx
                    const meta = scheduledMatchMeta(match);
                    const isKnockout = match.phase === "knockout";
                    const homeName = match.homeTeamId
                      ? (teamNames.get(match.homeTeamId) ?? "?")
                      : (match.homeSourceDescription ?? "TBD");
                    const awayName = match.awayTeamId
                      ? (teamNames.get(match.awayTeamId) ?? "?")
                      : (match.awaySourceDescription ?? "TBD");
                    const homeIsTbd = !match.homeTeamId;
                    const awayIsTbd = !match.awayTeamId;
                    const isTbdKnockout =
                      isKnockout && (homeIsTbd || awayIsTbd);

                    const pillClass =
                      meta.pillVariant === "dames"
                        ? "bg-brand/10 text-brand"
                        : "bg-ink/10 text-ink";

                    const cardClass = `flex w-full flex-col gap-4 rounded-lg border bg-card p-3 text-left transition-colors ${
                      isTbdKnockout
                        ? "border-dashed border-card-hair"
                        : "border-card-hair"
                    }`;

                    const inner = (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 font-display text-[10px] font-extrabold uppercase tracking-[0.14em] ${pillClass}`}
                          >
                            {meta.pillLabel}
                          </span>
                          <span className="text-[10px] font-semibold text-ink-muted">
                            {meta.rightEyebrow}
                          </span>
                        </div>
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                          <span
                            className={`truncate text-right text-[13px] ${
                              homeIsTbd
                                ? "italic font-medium text-ink-muted"
                                : "font-semibold text-ink"
                            }`}
                          >
                            {homeName}
                          </span>
                          {match.score ? (
                            <span className="font-display text-[20px] font-black leading-none text-ink tabular-nums whitespace-nowrap">
                              <span>{match.score.home}</span>
                              <span className="mx-[3px] font-medium text-ink-muted">
                                –
                              </span>
                              <span>{match.score.away}</span>
                            </span>
                          ) : (
                            <span className="font-display text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-muted">
                              VS
                            </span>
                          )}
                          <span
                            className={`truncate text-left text-[13px] ${
                              awayIsTbd
                                ? "italic font-medium text-ink-muted"
                                : "font-semibold text-ink"
                            }`}
                          >
                            {awayName}
                          </span>
                        </div>
                      </>
                    );

                    const canClick =
                      !isKnockout || (match.homeTeamId && match.awayTeamId);

                    return (
                      <td
                        key={field}
                        className="border border-card-hair p-1"
                      >
                        {canClick ? (
                          <button
                            onClick={() => onMatchClick(match)}
                            className={`${cardClass} hover:bg-surface`}
                          >
                            {inner}
                          </button>
                        ) : (
                          <div className={cardClass}>{inner}</div>
                        )}
                      </td>
                    );
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Verify lint**

Run: `npm run lint`
Expected: no new errors. If any warnings appear on the changed block, fix them (e.g. unused variable from the removed `isWomens`/`badgeClass`).

- [ ] **Step 4: Verify existing tests still pass**

Run: `npm run test:run`
Expected: all tests PASS, including the Task 1 meta helper tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/ScheduleGrid.tsx
git commit -m "feat(schedule): redesign match card cell (closes #23)"
```

---

## Task 3: Visual verification in the browser

**Files:** none (manual check).

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: Vite prints a local URL, typically `http://localhost:5173`.

- [ ] **Step 2: Render a tournament with both competitions and a seeded knockout**

Open the app. On the Setup page, ensure both Heren and Dames have at least one group with teams. Generate the schedule. On the Schedule tab, enter a score for at least one Heren group match and one Dames group match. From the Schedule tab (or after all group matches are played), generate a knockout bracket so the Schedule has at least one knockout match with both teams filled and one still showing TBD placeholders.

- [ ] **Step 3: Inspect each match state on the Schedule tab**

Check in the browser:

- **Pending Heren group match**: navy-tinted pill reads `Heren · <group-letter>`, right eyebrow reads `Groep`, body shows `<home> VS <away>` with `VS` in Barlow Condensed muted, solid border.
- **Finished Dames group match**: red-tinted pill reads `Dames · <group-letter>`, body shows score like `3 – 1` in Barlow Condensed 20px.
- **Knockout with both teams**: pill reads round name (e.g. `Halve finale`), right eyebrow reads the competition label, solid border, clickable.
- **Knockout with TBD placeholder(s)**: same pill / eyebrow, dashed border on the whole card, TBD team name rendered italic and `text-ink-muted`, card is non-clickable.
- **16px breathing room** between header row and teams row on all cards.
- **Long team names truncate** with ellipsis instead of wrapping — resize the viewport narrower to confirm.
- **No horizontal scrollbar** appears on the Schedule grid at default 4-field width on a typical laptop viewport.
- **Hover** on a clickable card swaps the background to the beige surface color; dashed unclickable cards do not.

If anything is off, stop here and report before committing further. If everything looks right, proceed.

- [ ] **Step 4: Stop the dev server**

Stop the `npm run dev` process (Ctrl-C).

- [ ] **Step 5: Final sanity — run the full test + lint + build**

Run: `npm run lint && npm run test:run && npm run build`
Expected: all three succeed.

- [ ] **Step 6: Nothing to commit unless Task 2 needed a fix**

If step 3 surfaced a visual issue that required a code edit, make the edit, re-run the checks, and commit with:

```bash
git add src/components/ScheduleGrid.tsx
git commit -m "fix(schedule): <what you fixed>"
```

Otherwise, this task is complete with no new commit.
