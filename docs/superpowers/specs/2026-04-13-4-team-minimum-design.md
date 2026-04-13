# 4-Team Minimum Competitions — Design

**Date:** 2026-04-13
**Status:** Approved, ready for implementation plan
**Issue:** VNDRN/football-tournament#16

## Summary

Support competitions with as few as **4 teams**. The current engine requires a minimum of 6 teams because it hardcodes `MIN_GROUPS = 2`. This change lowers the floor to 4 by allowing a single-group option, relaxes the UI minimum, and restricts the "advancing per group" dropdown for single-group competitions to values that produce clean bracket sizes (top 2 or top 4).

## Motivation

Small-scale editions of the tournament (e.g., a "meisjes" competition with only 4 teams alongside a larger "jongens" competition) are currently rejected at the Setup step with `"Minstens 6 teams nodig voor groepsopties"`. The existing engine already has all the machinery to handle this case — the group/knockout flow works with any `groupCount` and any bracket size — so enabling it is mostly a matter of relaxing hardcoded minimums and adapting one UI dropdown.

## Scope

**In scope:**

- Competitions with 4 or 5 teams
- Mixed tournaments (e.g., one competition with 4 teams + another with 12)
- Two allowed knockout shapes for single-group competitions: top-2 (just a final) and top-4 (semis + final + kleine finale)
- Top-4 is the default

**Out of scope:**

- Competitions with fewer than 4 teams (3, 2, 1)
- Group-only mode (no knockout phase at all — "top 1" advancing)
- Uneven-bracket knockout shapes like top-3 or 5-team brackets with byes
- Changes to the Groepen, Schema, or Knock-out pages — these already render whatever the engine produces

## Tournament structure for small competitions

A competition with `teamCount ∈ [4, 5]` becomes a single round-robin group followed by a knockout phase.

- **4 teams:** 6 group matches (everyone plays everyone once) → 4-team bracket
- **5 teams:** 10 group matches → 4-team bracket (5th place eliminated)

Bracket shape with `advancingPerGroup = 4` (default):

```
Halve finale       Finale
1  ──┐
     ├──┐
4  ──┘  │
        ├── 🏆
2  ──┐  │
     ├──┘
3  ──┘
+ Kleine finale (verliezers halve finales)
```

Bracket shape with `advancingPerGroup = 2` (optional):

```
Finale
1  ──┐
     ├── 🏆
2  ──┘
(no kleine finale — 3rd/4th from group standings)
```

Because there is only one group, every knockout match is intra-group. `seedBracket`'s same-group swap loop silently no-ops when no swap is possible, which is the correct behavior here.

## Architecture

Three touch points, all additive/narrowing — no new modules or types:

### 1. `src/engine/groups.ts`

Two constant changes + one new helper.

**Constant changes:**

```ts
// was: if (teamCount < 6) return [];
if (teamCount < 4) return [];

// was: const MIN_GROUPS = 2;
const MIN_GROUPS = 1;
```

Because `MIN_SIZE = 3` and `MAX_SIZE = 5` remain unchanged, the single-group path is only viable when `teamCount ∈ [3..5]`. Combined with the `teamCount < 4` guard this yields:

- `teamCount = 4` → `[{ groupCount: 1, sizes: [4], label: "1x4" }]`
- `teamCount = 5` → `[{ groupCount: 1, sizes: [5], label: "1x5" }]`
- `teamCount = 6` → still `[{ groupCount: 2, sizes: [3,3], label: "2x3" }]` (single group of 6 excluded by MAX_SIZE; 6 is exactly divisible into 2x3, so no regression)

**New helper:**

```ts
export function getAdvancingOptions(
  groupCount: number,
  sizes: number[]
): number[] {
  const maxAdvancing = maxAdvancingPerGroup(sizes);

  if (groupCount === 1) {
    // For single-group competitions, only offer values that produce a clean
    // bracket size (power of 2). With 4-5 team groups the valid values are
    // 2 (final only) and 4 (semis + final + kleine finale).
    const teamsInGroup = sizes[0];
    return [2, 4].filter((n) => n <= teamsInGroup);
  }

  // Multi-group competitions keep the existing top-1..top-N behavior.
  return Array.from({ length: maxAdvancing }, (_, i) => i + 1);
}
```

Note: for a single group of 4, `maxAdvancingPerGroup([4]) === 3`, but we still offer 4 because all 4 teams fill the bracket exactly (no "best next placed" needed). The helper explicitly bypasses `maxAdvancing` for the single-group case and caps at the group size instead.

### 2. `src/pages/SetupPage.tsx`

Three narrow edits in `CompetitionSetup`:

**Advancing dropdown (line 164):**

```tsx
// was:
{Array.from({ length: maxAdvancing }, (_, i) => i + 1).map((n) => ( ... ))}

// becomes:
{getAdvancingOptions(groupCount, selectedOption?.sizes ?? []).map((n) => ( ... ))}
```

**Minimum-teams message (line 193):**

```tsx
// was: "Minstens 6 teams nodig voor groepsopties."
// becomes: "Minstens 4 teams nodig voor groepsopties."
```

**`advancingPerGroup` reset useEffect (lines 71-79):** widen the guard so it fires not only when the current value exceeds max, but whenever the current value is no longer in the valid options list.

```tsx
useEffect(() => {
  if (!selectedOption) return;
  const validOptions = getAdvancingOptions(groupCount, selectedOption.sizes);
  const current = competition.config.advancingPerGroup;
  if (validOptions.includes(current)) return;

  // Pick the largest valid option <= current, else default to the largest valid
  // option (which is 4 for single-group comps when available, else 2).
  const target =
    [...validOptions].reverse().find((n) => n <= current) ??
    validOptions[validOptions.length - 1] ??
    1;

  dispatch({
    type: "UPDATE_COMPETITION_CONFIG",
    competitionId: competition.id,
    config: { advancingPerGroup: target },
  });
}, [groupCount, selectedOption, competition.config.advancingPerGroup, competition.id, dispatch]);
```

This replaces the existing `maxAdvancing` useEffect at lines 71-79.

### 3. `src/content/helpContent.ts`

Line 45:

```ts
// was: description: "Kies hoeveel groepen (min. 6 teams nodig).",
// becomes: description: "Kies hoeveel groepen (min. 4 teams nodig).",
```

## Unchanged (verified by tracing)

- **`src/engine/knockout.ts`** — `generateKnockoutRounds(4)` already emits semis + kleine finale + final. `generateKnockoutRounds(2)` emits only a final (the `bracketSize >= 4` guard correctly suppresses the kleine finale).
- **`src/engine/draft.ts`** — `createDraft` iterates `opt.groupCount`; works for `1`. `validateDraft` accepts sizes 3-5 inclusive.
- **`src/engine/scheduler.ts`** — processes a flat match list, structure-agnostic.
- **`src/pages/GroupsPage.tsx`, `SchedulePage.tsx`, `KnockoutPage.tsx`** — render whatever the engine produces.
- **`src/types.ts`** — no type changes.
- **Config/`estimatedSlots` math in SetupPage** — `calculateBracketFill(1, 4)` gives `{knockoutSize: 4, bestNextPlacedCount: 0}`; `calculateBracketFill(1, 2)` gives `{knockoutSize: 2, bestNextPlacedCount: 0}`. Both correct.
- **Mixed competitions** (4-team + 12-team in same tournament) — each `Competition` is independent; the scheduler sees a flat match list.

## Edge cases

1. **Same-group bracket matchups (unavoidable).** With a single group, every knockout match is between teams from the same group. `seedBracket`'s swap loop exits without swapping when no cross-group swap is possible — correct behavior.

2. **Stale config after team removal.** A user who drops a 10-team competition down to 4 teams may have `advancingPerGroup = 3`. The new reset useEffect detects `3 ∉ [2, 4]` and resets to `2` (largest valid ≤ 3). Default for a fresh 4-team comp is `4`.

3. **Switching groupSize when options change.** The existing `groupOptions[0].sizes[0]` default-selection useEffect at lines 61-69 still applies and picks the single available option. No change needed.

4. **Bracket-of-2 kleine finale suppression.** Explicitly tested to confirm `generateKnockoutRounds(2)` does not produce a kleine finale and that `advanceWinner` behaves correctly at the 2-team bracket (final only, no third-place).

5. **Scheduler slot counts.** `estimatedSlots` picks up the new shape transparently because it walks `getGroupOptions` + `calculateBracketFill` + the round-halving loop.

## Testing strategy

**`src/__tests__/engine/groups.test.ts`:**

- Update "returns empty for fewer than 6 teams" → "returns empty for fewer than 4 teams"; assert `[]` for `teamCount ∈ {0, 1, 2, 3}`
- New: `teamCount = 4` yields exactly `[{ groupCount: 1, sizes: [4] }]`
- New: `teamCount = 5` yields exactly `[{ groupCount: 1, sizes: [5] }]`
- Regression: `teamCount = 6` still yields only `[{ groupCount: 2, sizes: [3, 3] }]`
- Extend the completeness loop at line 573 from `6..24` to `4..24`
- New test block for `getAdvancingOptions`:
  - `(1, [4]) → [2, 4]`
  - `(1, [5]) → [2, 4]`
  - `(2, [3, 3]) → [1, 2]`
  - `(3, [4, 4, 4]) → [1, 2, 3]`

**`src/__tests__/engine/knockout.test.ts`:**

- New: `generateKnockoutRounds(2)` produces exactly one round with one match named "Finale" and no `isThirdPlace` round
- New: bracket of 4 seeded with 4 teams from the same group produces a valid structure (same-group matchups accepted, 1 vs 4 + 2 vs 3 seeding preserved)

**Manual verification checklist:**

- Create a 4-team competition, draw groups, confirm semis bracket renders correctly
- Create a 5-team competition, confirm 5th-placed team is absent from bracket
- Create a mixed tournament (4 + 10 teams), confirm scheduler handles both
- Switch a 4-team competition's advancing from top-4 to top-2, confirm bracket becomes a single final
- Drop a 10-team competition to 4 teams mid-setup, confirm `advancingPerGroup` resets cleanly

## Files changed

- `src/engine/groups.ts` — two constants + new `getAdvancingOptions` helper
- `src/pages/SetupPage.tsx` — dropdown source + min-teams message + reset useEffect
- `src/content/helpContent.ts` — one-line text update
- `src/__tests__/engine/groups.test.ts` — updated + new tests
- `src/__tests__/engine/knockout.test.ts` — new tests
