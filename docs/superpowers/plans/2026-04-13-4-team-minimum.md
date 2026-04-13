# 4-Team Minimum Competitions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lower the per-competition minimum from 6 teams to 4 teams by allowing a single round-robin group, and restrict the "advancing per group" dropdown for single-group competitions to values that produce clean bracket sizes (top 2 or top 4).

**Architecture:** Purely additive/narrowing changes. Two constant tweaks in `groups.ts` enable the single-group case (existing `MIN_SIZE=3`/`MAX_SIZE=5` naturally bound it to 4- and 5-team groups). A new `getAdvancingOptions` helper encapsulates the dropdown-value logic so the UI stays thin. `SetupPage.tsx` swaps its dropdown source and broadens the `advancingPerGroup` reset guard. `helpContent.ts` gets a one-line copy update to stay in sync with the lowered minimum.

**Tech Stack:** TypeScript, React 19, Vitest

**Spec:** `docs/superpowers/specs/2026-04-13-4-team-minimum-design.md`

**Issue:** VNDRN/football-tournament#16

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/engine/groups.ts` | Modify | Lower floor to 4, allow single group, add `getAdvancingOptions` helper |
| `src/__tests__/engine/groups.test.ts` | Modify | Update boundary tests, extend completeness loop, test new helper |
| `src/pages/SetupPage.tsx` | Modify | Use `getAdvancingOptions`, broaden reset guard, update min-teams message |
| `src/content/helpContent.ts` | Modify | Reflect new 4-team minimum in setup help copy |

No new files. No changes to `knockout.ts`, `draft.ts`, `scheduler.ts`, `types.ts`, or any Groepen/Schema/Knock-out pages (verified by tracing — all already handle the single-group / 4-team bracket / 2-team bracket paths correctly, and existing tests at `knockout.test.ts:42-104` already cover `bracketSize=2` and `bracketSize=4`; the all-same-group seed case is covered at `knockout.test.ts:502`).

---

## Task 1: Relax `getGroupOptions` to allow 4- and 5-team single groups

**Files:**
- Modify: `src/engine/groups.ts:10-51`
- Modify: `src/__tests__/engine/groups.test.ts:49-57` (boundary test) and `src/__tests__/engine/groups.test.ts:571-585` (completeness loop)

- [ ] **Step 1: Update the boundary test to reflect the new floor**

Open `src/__tests__/engine/groups.test.ts` and replace the test at lines 49-57:

```ts
// OLD:
//   it("returns empty for fewer than 6 teams", () => {
//     expect(getGroupOptions(0)).toEqual([]);
//     ...
//     expect(getGroupOptions(5)).toEqual([]);
//   });

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
```

- [ ] **Step 2: Widen the completeness loop to 4..24**

In the same file, replace line 573 inside `describe("qualifying count never exceeds team count")`:

```ts
// OLD:
//   for (let teamCount = 6; teamCount <= 24; teamCount++) {

for (let teamCount = 4; teamCount <= 24; teamCount++) {
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test:run -- src/__tests__/engine/groups.test.ts`

Expected: FAIL with something like `expected [ ] to have a length of 1 but got 0` on the new 4-team and 5-team tests (the code still returns `[]` for `teamCount < 6`).

- [ ] **Step 4: Implement the engine change**

Open `src/engine/groups.ts`. Replace lines 10-15 with:

```ts
export function getGroupOptions(teamCount: number): GroupOption[] {
  if (teamCount < 4) return [];

  const MIN_SIZE = 3;
  const MAX_SIZE = 5;
  const MIN_GROUPS = 1;
```

Two changes from the original:
- `teamCount < 6` → `teamCount < 4`
- `MIN_GROUPS = 2` → `MIN_GROUPS = 1`

Nothing else in `getGroupOptions` needs to change. `MAX_SIZE = 5` continues to exclude a single group of 6+ (so `teamCount=6` still yields only `{2x3}`, no regression).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:run -- src/__tests__/engine/groups.test.ts`

Expected: PASS — all existing tests still green, new 4-team / 5-team tests green, completeness loop now covers 4-24 without failures.

- [ ] **Step 6: Commit**

```bash
git add src/engine/groups.ts src/__tests__/engine/groups.test.ts
git commit -m "feat(engine): allow single-group competitions down to 4 teams"
```

---

## Task 2: Add `getAdvancingOptions` helper for dropdown values

**Files:**
- Modify: `src/engine/groups.ts` (add new exported function at end)
- Modify: `src/__tests__/engine/groups.test.ts` (add new `describe` block)

- [ ] **Step 1: Write the failing test**

Append to `src/__tests__/engine/groups.test.ts` (after the existing `describe` blocks, before the final closing lines):

```ts
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
```

Also update the import at lines 2-7 of the same file to include `getAdvancingOptions`:

```ts
import {
  getGroupOptions,
  generateRoundRobinMatches,
  calculateBracketFill,
  maxAdvancingPerGroup,
  getAdvancingOptions,
} from "../../engine/groups";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/__tests__/engine/groups.test.ts`

Expected: FAIL with `getAdvancingOptions is not a function` or a TypeScript compile error (symbol not exported).

- [ ] **Step 3: Implement the helper**

Append to `src/engine/groups.ts` (after the existing `maxAdvancingPerGroup` function):

```ts
export function getAdvancingOptions(
  groupCount: number,
  sizes: number[]
): number[] {
  if (sizes.length === 0) return [];

  if (groupCount === 1) {
    // For single-group competitions, only offer values that produce a clean
    // bracket size (power of 2). With 4-5 team groups the valid values are
    // 2 (final only) and 4 (semis + final + kleine finale).
    const teamsInGroup = sizes[0];
    return [2, 4].filter((n) => n <= teamsInGroup);
  }

  const max = maxAdvancingPerGroup(sizes);
  return Array.from({ length: max }, (_, i) => i + 1);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/__tests__/engine/groups.test.ts`

Expected: PASS — all `getAdvancingOptions` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/groups.ts src/__tests__/engine/groups.test.ts
git commit -m "feat(engine): add getAdvancingOptions helper for knockout sizing"
```

---

## Task 3: Wire `getAdvancingOptions` into the Setup page dropdown and reset guard

**Files:**
- Modify: `src/pages/SetupPage.tsx:1-198` (`CompetitionSetup` component)

- [ ] **Step 1: Update imports**

Open `src/pages/SetupPage.tsx`. At lines 11-16, swap `maxAdvancingPerGroup` for `getAdvancingOptions` (the former becomes unused after this task):

```ts
import {
  getGroupOptions,
  generateRoundRobinMatches,
  calculateBracketFill,
  getAdvancingOptions,
} from "../engine/groups";
```

- [ ] **Step 2: Replace `maxAdvancing` with `advancingOptions` in the component**

In `CompetitionSetup`, remove the existing block at lines 57-60:

```ts
// REMOVE:
//   const maxAdvancing = selectedOption
//     ? maxAdvancingPerGroup(selectedOption.sizes)
//     : 1;
```

In its place add:

```ts
const advancingOptions = useMemo(
  () =>
    selectedOption
      ? getAdvancingOptions(groupCount, selectedOption.sizes)
      : [],
  [groupCount, selectedOption]
);
```

- [ ] **Step 3: Replace the reset useEffect**

Replace the useEffect at lines 71-79:

```tsx
// OLD:
//   useEffect(() => {
//     if (competition.config.advancingPerGroup > maxAdvancing) {
//       dispatch({
//         type: "UPDATE_COMPETITION_CONFIG",
//         competitionId: competition.id,
//         config: { advancingPerGroup: maxAdvancing },
//       });
//     }
//   }, [maxAdvancing, competition.config.advancingPerGroup, competition.id, dispatch]);

useEffect(() => {
  if (advancingOptions.length === 0) return;
  const current = competition.config.advancingPerGroup;
  if (advancingOptions.includes(current)) return;

  // Pick the largest valid option <= current, else the largest valid option overall.
  const target =
    [...advancingOptions].reverse().find((n) => n <= current) ??
    advancingOptions[advancingOptions.length - 1];

  dispatch({
    type: "UPDATE_COMPETITION_CONFIG",
    competitionId: competition.id,
    config: { advancingPerGroup: target },
  });
}, [advancingOptions, competition.config.advancingPerGroup, competition.id, dispatch]);
```

This fires whenever the current `advancingPerGroup` is no longer in the valid options list (including the new case where a 10-team competition drops to 4 teams and `3` is no longer a valid choice).

- [ ] **Step 4: Swap the dropdown source**

Replace the dropdown body at line 164:

```tsx
// OLD:
//   {Array.from({ length: maxAdvancing }, (_, i) => i + 1).map(
//     (n) => (
//       <option key={n} value={n}>
//         Top {n}
//       </option>
//     )
//   )}

{advancingOptions.map((n) => (
  <option key={n} value={n}>
    Top {n}
  </option>
))}
```

- [ ] **Step 5: Update the min-teams message**

Replace line 193:

```tsx
// OLD:  Minstens 6 teams nodig voor groepsopties.
<p className="mt-3 text-sm text-ink-soft">
  Minstens 4 teams nodig voor groepsopties.
</p>
```

- [ ] **Step 6: Run lint + typecheck + tests**

Run these in parallel:

```bash
npm run lint
npm run build
npm run test:run
```

Expected: all three succeed. The build includes `tsc -b` which catches any TypeScript errors introduced by the refactor.

- [ ] **Step 7: Manual smoke test**

Run: `npm run dev` and open the printed URL.

Verify in the browser:
1. Open Setup, pick the first competition, add 4 team names. Confirm:
   - "Groepsindeling" dropdown shows `1 groepen (1x4)`
   - "Doorgang per groep" dropdown shows only `Top 2` and `Top 4`
   - Default is `Top 4`
   - The knock-out preview below shows "4 teams (top 4)"
2. Change the 4-team competition to `Top 2` — the knock-out preview shows "2 teams (top 2)".
3. Add a second competition with 12 teams — confirm its dropdown still shows the full range (`Top 1`, `Top 2`, `Top 3`, etc.) and works independently.
4. On the 12-team comp, pick `Top 3`. Then remove teams until only 4 remain. Confirm `advancingPerGroup` resets cleanly (not stuck on 3, ends up on `Top 2`).
5. Remove a team to bring the competition below 4. Confirm the "Minstens 4 teams nodig voor groepsopties." message appears.

Stop the dev server with `Ctrl-C` when done.

- [ ] **Step 8: Commit**

```bash
git add src/pages/SetupPage.tsx
git commit -m "feat(setup): enable 4-team competitions with constrained advancing dropdown"
```

---

## Task 4: Sync help content with the new minimum

**Files:**
- Modify: `src/content/helpContent.ts:43-46`

- [ ] **Step 1: Update the copy**

Open `src/content/helpContent.ts`. Replace line 45:

```ts
// OLD:  description: "Kies hoeveel groepen (min. 6 teams nodig).",
      {
        label: "Groepsindeling",
        description: "Kies hoeveel groepen (min. 4 teams nodig).",
      },
```

- [ ] **Step 2: Run tests to verify nothing regressed**

Run: `npm run test:run`

Expected: PASS — the `helpContent` data test at `src/__tests__/content/helpContent.test.ts` just checks that entries are non-empty, so copy changes don't break it.

- [ ] **Step 3: Manual check**

Run: `npm run dev`, open the app, go to Setup, click the `?` help button. Confirm the "Groepsindeling" entry reads "Kies hoeveel groepen (min. 4 teams nodig)."

- [ ] **Step 4: Commit**

```bash
git add src/content/helpContent.ts
git commit -m "docs(help): update setup help to reflect 4-team minimum"
```

---

## Task 5: End-to-end verification

**Files:** none

- [ ] **Step 1: Run the full test suite**

```bash
npm run test:run
```

Expected: all tests PASS.

- [ ] **Step 2: Run lint and build**

```bash
npm run lint && npm run build
```

Expected: both succeed with zero errors.

- [ ] **Step 3: Full manual walk-through**

Run: `npm run dev`, open the app.

1. Create a tournament with two competitions: 4 teams + 10 teams.
2. For the 4-team comp, accept defaults (Top 4). Draw groups. Confirm a single `Groep A` of 4 teams appears in the draft.
3. Confirm the draft editor does not report validation errors (group of 4 is within 3-5 bounds).
4. Confirm estimated slot count looks reasonable (~6 group matches + 3 KO matches for the 4-team comp + whatever the 10-team comp contributes).
5. Click "Bevestigen". Verify the Groepen page shows the `Groep A` standings table for the 4-team comp.
6. Play all 6 group matches for the 4-team comp by entering scores.
7. On the Schema page, confirm the knockout phase becomes available. Generate it. Confirm the bracket shows `Halve finale` (1 vs 4, 2 vs 3) → `Kleine finale` + `Finale`.
8. Play all 4 knockout matches. Confirm a winner is declared.
9. Repeat steps 2-8 but with a 5-team competition. Confirm:
   - 5th-placed group team is NOT pulled into the bracket.
   - Bracket remains a 4-team bracket.
10. Repeat once more with a 4-team competition set to `Top 2`. Confirm the bracket is a single final (no kleine finale, no semis).

- [ ] **Step 4: Verify the branch is clean**

```bash
git status
```

Expected: `nothing to commit, working tree clean`.

---

## Summary of changes

- `src/engine/groups.ts` — two constant edits + new `getAdvancingOptions` export
- `src/__tests__/engine/groups.test.ts` — updated boundary test, new 4- and 5-team tests, widened completeness loop, new `getAdvancingOptions` describe block
- `src/pages/SetupPage.tsx` — `getAdvancingOptions`-based dropdown, broadened reset guard, updated min-teams message
- `src/content/helpContent.ts` — one-line copy sync

**Commits:** 4 atomic commits following conventional-commit prefixes (`feat(engine):`, `feat(engine):`, `feat(setup):`, `docs(help):`).

**Existing coverage reused:**
- `knockout.test.ts:42-104` — `bracketSize=2` and `bracketSize=4` round generation (spec's bracket semantics)
- `knockout.test.ts:502` — `seedBracket` with 4 teams all from the same group
- `knockout.test.ts` 8/16/32 bracket tests — regression protection for multi-group flows

**Non-goals (left unchanged):**
- Knock-out / Schedule / Groups page UI
- Scheduler algorithm
- Type definitions
- Draft validation rules
- 3-team or 2-team support (out of scope per spec)
