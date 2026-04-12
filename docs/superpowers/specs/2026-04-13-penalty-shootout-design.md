# Penalty Shootout Support for Knockout Matches

When a knockout match ends in a draw, users can enter a penalty shootout score to determine the winner.

## Data Model

The score shape is currently inline `{ home: number; away: number }` — used in `Match.score`, `KnockoutMatch.score`, and the `SET_SCORE` / `SET_KNOCKOUT_SCORE` action types. Extract a named `Score` type and extend it:

```ts
// types.ts
type Score = { home: number; away: number; penHome?: number; penAway?: number };
```

Replace all inline `{ home: number; away: number }` references with `Score`. Backwards-compatible: existing scores without `pen*` fields continue to work unchanged.

## ScoreInput Component

The `ScoreInput` component gains awareness of knockout context:

- **New prop**: `isKnockout: boolean` (default `false`)
- **Auto-reveal**: When `isKnockout` is `true` and `home === away`, a penalty input section appears below the main score, separated by a dashed amber border
- **Styling**: Penalty inputs use amber/yellow theme (`#fbbf24` border, `#fffbeb` background) to visually distinguish from the regular score
- **Validation**: Save button is disabled when penalties are also a draw (`penHome === penAway`) — penalty shootouts must have a winner
- **Auto-reset**: When the user changes the main score so it's no longer a draw, penalty fields hide and values reset to 0
- **Initial state**: `penHome` and `penAway` initialize from `initialScore.penHome` / `initialScore.penAway` (for editing existing penalty results), defaulting to 0
- **onSave payload**: Passes `{ home, away, penHome, penAway }` when penalties are active, `{ home, away }` when not

## Engine — `advanceWinner()` in `knockout.ts`

The draw branch (currently line 206) changes from automatic home-team-wins to penalty-aware logic:

```
if home > away → home wins
if away > home → away wins
if draw:
  if penHome > penAway → home wins
  if penAway > penHome → away wins
  otherwise → no advancement (match incomplete)
```

The "no advancement" case covers: no penalties entered yet, or penalties also tied (which the UI prevents on save, but the engine should be defensive).

## BracketView — `MatchSlot` Display

When a match has `penHome` and `penAway` set:

- Show penalty score in parentheses next to the regular score: `2 (4)` vs `2 (3)`
- Penalty number styled smaller (`text-[10px]`) in amber (`text-amber-600`)
- Winner highlighting (green) applies to the team that won on penalties

## KnockoutPage — Champion Detection

The champion logic (lines 65-77) uses the same winner detection as `advanceWinner`: check regular score first, then penalties on draw.

## MatchCard — Schedule Tab Display

For knockout matches with penalties, the compact score pill shows: `2-2 (4-3 pen)`.

## Touchpoints Summary

| File | Change |
|------|--------|
| `src/types.ts` | Add `penHome?: number; penAway?: number` to score type |
| `src/components/ScoreInput.tsx` | Add `isKnockout` prop, conditional penalty inputs, validation |
| `src/engine/knockout.ts` | Update `advanceWinner()` draw branch to use penalty scores |
| `src/components/BracketView.tsx` | Show `(pen)` scores in `MatchSlot` |
| `src/pages/KnockoutPage.tsx` | Pass `isKnockout` to ScoreInput, fix champion detection |
| `src/components/MatchCard.tsx` | Show penalty info in compact score pill |
| `src/__tests__/engine/knockout.test.ts` | Add penalty shootout test cases |

## Out of Scope

- Individual penalty kick tracking (who scored/missed each kick)
- Extra time as a separate concept — this is a simple amateur tournament, just penalties
- Penalty support for group stage matches (draws are fine in groups)
