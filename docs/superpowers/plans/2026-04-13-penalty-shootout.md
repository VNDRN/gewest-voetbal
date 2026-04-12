# Penalty Shootout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a knockout match ends in a draw, allow entering a penalty shootout score to determine the winner.

**Architecture:** Extract a named `Score` type with optional `penHome`/`penAway` fields. `ScoreInput` auto-reveals penalty inputs when knockout scores are equal. `advanceWinner()` uses penalty scores to break draws. `BracketView` and `MatchCard` display penalty results inline.

**Tech Stack:** React 19, TypeScript, Vitest, Tailwind CSS

---

### Task 1: Extract `Score` type and add penalty fields

**Files:**
- Modify: `src/types.ts`
- Modify: `src/context/TournamentContext.tsx`

- [ ] **Step 1: Add `Score` type to `types.ts`**

In `src/types.ts`, add the named type above `Match`:

```ts
export type Score = {
  home: number;
  away: number;
  penHome?: number;
  penAway?: number;
};
```

Then replace the inline score shapes:

In `Match`:
```ts
score: Score | null;
```

In `StandingRow` — no change needed (it doesn't reference score directly).

- [ ] **Step 2: Update `TournamentContext.tsx` action types**

In `src/context/TournamentContext.tsx`, import `Score` from `../types` and replace inline score shapes in the `SET_SCORE` and `SET_KNOCKOUT_SCORE` action types:

```ts
// SET_SCORE action
score: Score;

// SET_KNOCKOUT_SCORE action
score: Score;
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors (the `Score` type is a superset of the old inline shape)

- [ ] **Step 4: Commit**

```
feat(types): extract Score type with optional penalty fields
```

---

### Task 2: Update `advanceWinner()` to use penalty scores (TDD)

**Files:**
- Modify: `src/__tests__/engine/knockout.test.ts`
- Modify: `src/engine/knockout.ts`

- [ ] **Step 1: Update existing draw test**

In `src/__tests__/engine/knockout.test.ts`, find the `"draw scenario"` describe block (~line 841). Replace the existing test:

```ts
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
```

- [ ] **Step 2: Add penalty shootout tests**

Add a new describe block after the `"draw scenario"` block:

```ts
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
```

- [ ] **Step 3: Run tests to verify failures**

Run: `npx vitest run src/__tests__/engine/knockout.test.ts`
Expected: The new penalty tests fail (current code advances home team on draw without checking penalties). The updated "draw without penalties" test also fails (current code still advances home team).

- [ ] **Step 4: Update `advanceWinner()` in `knockout.ts`**

In `src/engine/knockout.ts`, replace the winner determination block (lines 198-210):

```ts
  let winnerId: string | null;
  let loserId: string | null;
  if (match.score.home > match.score.away) {
    winnerId = match.homeTeamId;
    loserId = match.awayTeamId;
  } else if (match.score.away > match.score.home) {
    winnerId = match.awayTeamId;
    loserId = match.homeTeamId;
  } else if (match.score.penHome != null && match.score.penAway != null && match.score.penHome !== match.score.penAway) {
    winnerId = match.score.penHome > match.score.penAway ? match.homeTeamId : match.awayTeamId;
    loserId = match.score.penHome > match.score.penAway ? match.awayTeamId : match.homeTeamId;
  } else {
    return result;
  }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/engine/knockout.test.ts`
Expected: all tests pass

- [ ] **Step 6: Also update the old 0-0 draw test**

Find the test `"score 0-0 draw: home team advances as tiebreak"` (~line 1356). Update it to reflect the new behavior:

```ts
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
```

- [ ] **Step 7: Run full test suite**

Run: `npx vitest run`
Expected: all tests pass

- [ ] **Step 8: Commit**

```
feat(knockout): use penalty scores to decide drawn matches
```

---

### Task 3: Add penalty inputs to `ScoreInput`

**Files:**
- Modify: `src/components/ScoreInput.tsx`

- [ ] **Step 1: Add `isKnockout` prop and penalty state**

Update the `Props` type and add state:

```ts
type Props = {
  homeTeam: string;
  awayTeam: string;
  initialScore: Score | null;
  isKnockout?: boolean;
  onSave: (score: Score) => void;
  onClose: () => void;
};
```

Import `Score` from `../types`. Add penalty state after the existing `home`/`away` state:

```ts
const [penHome, setPenHome] = useState(initialScore?.penHome ?? 0);
const [penAway, setPenAway] = useState(initialScore?.penAway ?? 0);
```

- [ ] **Step 2: Add derived state and save logic**

After the state declarations:

```ts
const isDraw = isKnockout && home === away;
const penaltyAlsoDraw = isDraw && penHome === penAway;

const handleSave = () => {
  if (isDraw) {
    onSave({ home, away, penHome, penAway });
  } else {
    onSave({ home, away });
  }
};
```

Update the `useEffect` keydown handler to use `handleSave` instead of inline `onSave`:
```ts
if (e.key === "Enter" && !penaltyAlsoDraw) handleSave();
```

Replace all `onSave({ home, away })` calls with `handleSave()`.

- [ ] **Step 3: Reset penalties when score changes away from draw**

Add a `useEffect` to reset penalties when scores become unequal:

```ts
useEffect(() => {
  if (!isDraw) {
    setPenHome(0);
    setPenAway(0);
  }
}, [isDraw]);
```

- [ ] **Step 4: Add penalty input UI**

After the main score `</div>` (the flex container with the two score inputs), add the penalty section:

```tsx
{isDraw && (
  <div className="mt-4 border-t-2 border-dashed border-amber-400 pt-4">
    <div className="mb-2 text-center text-xs font-semibold text-amber-600">
      Strafschoppen
    </div>
    <div className="flex items-center justify-center gap-6">
      <div className="flex flex-col items-center gap-1">
        <input
          type="number"
          min={0}
          value={penHome}
          onChange={(e) => setPenHome(Math.max(0, parseInt(e.target.value) || 0))}
          className="h-12 w-16 rounded-lg border-2 border-amber-400 bg-amber-50 text-center text-2xl font-bold focus:border-amber-500 focus:outline-none"
        />
      </div>
      <span className="text-xl font-bold text-gray-400">-</span>
      <div className="flex flex-col items-center gap-1">
        <input
          type="number"
          min={0}
          value={penAway}
          onChange={(e) => setPenAway(Math.max(0, parseInt(e.target.value) || 0))}
          className="h-12 w-16 rounded-lg border-2 border-amber-400 bg-amber-50 text-center text-2xl font-bold focus:border-amber-500 focus:outline-none"
        />
      </div>
    </div>
    {penaltyAlsoDraw && (
      <p className="mt-2 text-center text-xs text-red-500">
        Strafschoppen mogen niet gelijk zijn
      </p>
    )}
  </div>
)}
```

- [ ] **Step 5: Disable save button when penalties are a draw**

Update the save button to add `disabled` and conditional styling:

```tsx
<button
  onClick={handleSave}
  disabled={penaltyAlsoDraw}
  className={`rounded-lg px-5 py-2 text-sm font-medium text-white ${
    penaltyAlsoDraw
      ? "cursor-not-allowed bg-blue-300"
      : "bg-blue-600 hover:bg-blue-700"
  }`}
>
  Opslaan
</button>
```

- [ ] **Step 6: Run typecheck and lint**

Run: `npx tsc -b --noEmit && npx eslint src/components/ScoreInput.tsx`
Expected: no errors

- [ ] **Step 7: Commit**

```
feat(ui): add penalty shootout inputs to ScoreInput
```

---

### Task 4: Pass `isKnockout` from calling pages

**Files:**
- Modify: `src/pages/KnockoutPage.tsx`
- Modify: `src/pages/SchedulePage.tsx`

- [ ] **Step 1: Update `KnockoutPage.tsx`**

Import `Score` from `../types`. Add `isKnockout` prop to the `ScoreInput` usage (~line 129):

```tsx
<ScoreInput
  homeTeam={...}
  awayTeam={...}
  initialScore={editingMatch.match.score}
  isKnockout
  onClose={() => setEditingMatch(null)}
  onSave={(score) => {
```

Also fix the champion detection logic (~lines 67-73). Replace:

```ts
const winnerId =
  final.score.home > final.score.away
    ? final.homeTeamId
    : final.score.away > final.score.home
      ? final.awayTeamId
      : final.homeTeamId;
```

With:

```ts
let winnerId: string | null;
if (final.score.home > final.score.away) {
  winnerId = final.homeTeamId;
} else if (final.score.away > final.score.home) {
  winnerId = final.awayTeamId;
} else if (final.score.penHome != null && final.score.penAway != null && final.score.penHome > final.score.penAway) {
  winnerId = final.homeTeamId;
} else if (final.score.penHome != null && final.score.penAway != null && final.score.penAway > final.score.penHome) {
  winnerId = final.awayTeamId;
} else {
  winnerId = null;
}
```

- [ ] **Step 2: Update `SchedulePage.tsx`**

Add `isKnockout` prop to the `ScoreInput` in `SchedulePage.tsx` (~line 219). The match phase is already available via `editingMatch.phase`:

```tsx
<ScoreInput
  homeTeam={teamNames.get(editingMatch.homeTeamId ?? "") ?? "Thuis"}
  awayTeam={teamNames.get(editingMatch.awayTeamId ?? "") ?? "Uit"}
  initialScore={editingMatch.score}
  isKnockout={editingMatch.phase === "knockout"}
  onClose={() => setEditingMatch(null)}
  onSave={(score) => {
```

- [ ] **Step 3: Run typecheck and lint**

Run: `npx tsc -b --noEmit && npx eslint src/pages/KnockoutPage.tsx src/pages/SchedulePage.tsx`
Expected: no errors

- [ ] **Step 4: Commit**

```
feat(ui): wire up penalty shootout in knockout and schedule pages
```

---

### Task 5: Display penalty scores in `BracketView` and `MatchCard`

**Files:**
- Modify: `src/components/BracketView.tsx`
- Modify: `src/components/MatchCard.tsx`

- [ ] **Step 1: Update `MatchSlot` in `BracketView.tsx`**

Import `Score` from `../types` (already imports `KnockoutMatch` which has `score: Score | null`).

In the `MatchSlot` component, update the score display. Find the home score span (~line 45):

```tsx
<span className={`font-bold ${match.score!.home > match.score!.away ? "text-green-600" : "text-gray-500"}`}>
  {match.score!.home}
</span>
```

Replace both score display sections (home and away). First add a helper inside `MatchSlot` to determine the winner:

```ts
const hasPenalties = isComplete && match.score!.home === match.score!.away
  && match.score!.penHome != null && match.score!.penAway != null;
const homeWins = isComplete && (
  match.score!.home > match.score!.away
  || (hasPenalties && match.score!.penHome! > match.score!.penAway!)
);
const awayWins = isComplete && (
  match.score!.away > match.score!.home
  || (hasPenalties && match.score!.penAway! > match.score!.penHome!)
);
```

Then update the home score display:

```tsx
{isComplete && (
  <span className="flex items-center gap-1">
    <span className={`font-bold ${homeWins ? "text-green-600" : "text-gray-500"}`}>
      {match.score!.home}
    </span>
    {hasPenalties && (
      <span className="text-[10px] font-semibold text-amber-600">({match.score!.penHome})</span>
    )}
  </span>
)}
```

And the away score display:

```tsx
{isComplete && (
  <span className="flex items-center gap-1">
    <span className={`font-bold ${awayWins ? "text-green-600" : "text-gray-500"}`}>
      {match.score!.away}
    </span>
    {hasPenalties && (
      <span className="text-[10px] font-semibold text-amber-600">({match.score!.penAway})</span>
    )}
  </span>
)}
```

- [ ] **Step 2: Update `MatchCard.tsx`**

In `src/components/MatchCard.tsx`, update the compact score pill to show penalties. Replace the score display span:

```tsx
<span className="mx-2 rounded bg-gray-100 px-2 py-0.5 font-mono text-xs">
  {match.score
    ? match.score.home === match.score.away && match.score.penHome != null
      ? `${match.score.home}-${match.score.away} (${match.score.penHome}-${match.score.penAway} pen)`
      : `${match.score.home} - ${match.score.away}`
    : "vs"}
</span>
```

- [ ] **Step 3: Run typecheck and lint**

Run: `npx tsc -b --noEmit && npx eslint src/components/BracketView.tsx src/components/MatchCard.tsx`
Expected: no errors

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: all tests pass

- [ ] **Step 5: Commit**

```
feat(ui): display penalty scores in bracket and match cards
```

---

### Task 6: Manual smoke test

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Test the golden path**

1. Navigate to the Knockout tab
2. Click a match with both teams seeded
3. Enter a draw score (e.g., 2-2)
4. Verify penalty inputs appear with amber styling
5. Enter penalty score (e.g., 4-3)
6. Save — verify the correct team advances
7. Verify bracket shows `2 (4)` and `2 (3)` with green highlighting on the winner

- [ ] **Step 3: Test edge cases**

1. Enter penalties as a draw (3-3) — verify save button is disabled with validation message
2. Change main score from draw (2-2) to non-draw (3-2) — verify penalty fields disappear
3. Re-edit a match with existing penalties — verify penalty values are pre-filled
4. Enter a non-draw knockout score — verify no penalty fields appear
5. Score a group match as a draw — verify no penalty fields appear
6. Score the final as a draw with penalties — verify champion banner shows correct winner

- [ ] **Step 4: Test from schedule tab**

1. Navigate to the Schedule tab
2. Score a knockout match as a draw with penalties
3. Verify advancement works correctly from the schedule tab too

- [ ] **Step 5: Commit (if any fixes needed)**

```
fix(penalties): [describe any fix]
```
