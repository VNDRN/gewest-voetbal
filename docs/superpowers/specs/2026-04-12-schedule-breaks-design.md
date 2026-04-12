# Schedule Breaks

Closes #4. Allow the admin to insert pause/break slots into the schedule.

## Data Model

New type:

```typescript
type ScheduleBreak = {
  id: string;
  afterTimeSlot: number;
  durationMinutes: number;
};
```

Added to `TournamentConfig`:

```typescript
type TournamentConfig = {
  fieldCount: number;
  slotDurationMinutes: number;
  startTime: string;
  breaks: ScheduleBreak[];
};
```

Breaks are stored as config-level data. Match timeslots (integer indices) are never mutated when breaks are added, edited, or removed.

## Time Calculation

Current formula: `wallClock = startTime + (slot × slotDuration)`

New formula: `wallClock = startTime + (slot × slotDuration) + sumOfBreakMinutesBefore(slot)`

Where `sumOfBreakMinutesBefore(slot)` sums `durationMinutes` for all breaks where `afterTimeSlot < slot`.

A shared `formatTime(slot, startTime, slotDuration, breaks)` utility replaces the three duplicate implementations in ScheduleGrid, SetupPage, and exportImport.

## Auto-Generation

When `handleGenerate()` runs in SetupPage, after scheduling both group matches and knockout rounds, it finds the maximum group-phase timeslot and inserts a default break:

```typescript
{ id: crypto.randomUUID(), afterTimeSlot: maxGroupSlot, durationMinutes: 10 }
```

This gives a 10-minute default break between the group phase and knockout phase.

## State Management

Three new actions on `TournamentAction`:

- `ADD_BREAK { breakItem: ScheduleBreak }` — push to `config.breaks`
- `UPDATE_BREAK { breakId: string, durationMinutes: number }` — update duration
- `REMOVE_BREAK { breakId: string }` — remove from array

The reducer handles these by updating `state.config.breaks`. No match data is touched.

## Schedule Grid UI

### Break Row

When iterating timeslots, after rendering a slot's row, check if a break exists with `afterTimeSlot === slot`. If so, render a break row:

- Full-width `<tr>` with `colspan` spanning the time column + all field columns
- Yellow/amber background with dashed top and bottom borders
- Left side: ☕ emoji, "Pauze" label, computed time range (e.g. "12:00 – 12:10")
- Right side: inline `<input type="number" min="1">` for duration (minutes), delete ✕ button
- Changing the input dispatches `UPDATE_BREAK`
- Clicking ✕ dispatches `REMOVE_BREAK`

### Add Break (Hover)

Between each pair of timeslot rows, render an invisible hover zone. On hover, a "+" circle button appears centered on a dashed line. Clicking it dispatches `ADD_BREAK` with `afterTimeSlot` set to the slot above and `durationMinutes: 10`.

The hover zone is only visible on `:hover` — no visual clutter at rest. This keeps the focus on the match rows. Hover zones appear between consecutive slot rows only (not before the first or after the last).

### Time Display

All time cells in the grid use the updated `formatTime` that accounts for breaks. Subsequent slots after a break show the shifted wall-clock time.

## Affected Files

| File | Change |
|------|--------|
| `src/types.ts` | Add `ScheduleBreak` type, add `breaks` to `TournamentConfig` |
| `src/engine/time.ts` | New shared `formatTime` + `getBreakMinutesBefore` utils |
| `src/context/TournamentContext.tsx` | Add `ADD_BREAK`, `UPDATE_BREAK`, `REMOVE_BREAK` actions, handle in reducer, default `breaks: []` in `createDefaultTournament` |
| `src/components/ScheduleGrid.tsx` | Render break rows, hover add zones, use new `formatTime` |
| `src/pages/SetupPage.tsx` | Auto-insert default break in `handleGenerate()`, use new `formatTime` |
| `src/pages/SchedulePage.tsx` | Pass `breaks` to `ScheduleGrid` |
| `src/persistence/exportImport.ts` | Use new `formatTime`, handle breaks in CSV export |
| `src/persistence/localStorage.ts` | Migration: default `breaks: []` for existing saved state without it |
| `src/__tests__/engine/time.test.ts` | Tests for `formatTime` and `getBreakMinutesBefore` |

## Export

CSV export uses the same updated `formatTime` so exported times reflect breaks. JSON export includes breaks naturally since they're part of `TournamentConfig`.

## Migration

Existing saved tournaments won't have `breaks` on their config. `loadState()` defaults it to `[]` if missing, so no breaking change.
