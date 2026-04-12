# Schedule Breaks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to insert, edit, and remove pause/break slots in the schedule, with a default 10-minute break auto-inserted between group and knockout phases.

**Architecture:** Breaks stored as `ScheduleBreak[]` on `TournamentConfig`. Match timeslots are never mutated — a shared `formatTime` util sums break durations before each slot to compute wall-clock time. The ScheduleGrid renders break rows inline and hover zones between rows for adding new breaks.

**Tech Stack:** React 19, TypeScript, Vitest, Tailwind CSS 4

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/types.ts` | Modify | Add `ScheduleBreak` type, add `breaks` to `TournamentConfig` |
| `src/engine/time.ts` | Create | Shared `formatTime` and `getBreakMinutesBefore` utils |
| `src/__tests__/engine/time.test.ts` | Create | Tests for time utils |
| `src/context/TournamentContext.tsx` | Modify | New reducer actions, default `breaks: []` |
| `src/persistence/localStorage.ts` | Modify | Migration: default `breaks: []` for existing state |
| `src/components/ScheduleGrid.tsx` | Modify | Break rows, hover add zones, updated time display |
| `src/pages/SchedulePage.tsx` | Modify | Pass breaks + dispatch to ScheduleGrid |
| `src/pages/SetupPage.tsx` | Modify | Auto-insert default break, use shared `formatTime` |
| `src/persistence/exportImport.ts` | Modify | Use shared `formatTime` |

---

### Task 1: Types & Time Utils (TDD)

**Files:**
- Modify: `src/types.ts`
- Create: `src/engine/time.ts`
- Create: `src/__tests__/engine/time.test.ts`

- [ ] **Step 1: Add `ScheduleBreak` type and update `TournamentConfig`**

In `src/types.ts`, add after the `TournamentConfig` type:

```typescript
export type ScheduleBreak = {
  id: string;
  afterTimeSlot: number;
  durationMinutes: number;
};
```

And update `TournamentConfig`:

```typescript
export type TournamentConfig = {
  fieldCount: number;
  slotDurationMinutes: number;
  startTime: string;
  breaks: ScheduleBreak[];
};
```

- [ ] **Step 2: Write failing tests for time utils**

Create `src/__tests__/engine/time.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { formatTime, getBreakMinutesBefore } from "../../engine/time";
import type { ScheduleBreak } from "../../types";

describe("getBreakMinutesBefore", () => {
  it("returns 0 when no breaks exist", () => {
    expect(getBreakMinutesBefore(5, [])).toBe(0);
  });

  it("returns 0 for slots at or before the break", () => {
    const breaks: ScheduleBreak[] = [
      { id: "b1", afterTimeSlot: 3, durationMinutes: 10 },
    ];
    expect(getBreakMinutesBefore(3, breaks)).toBe(0);
    expect(getBreakMinutesBefore(2, breaks)).toBe(0);
  });

  it("returns break duration for slots after the break", () => {
    const breaks: ScheduleBreak[] = [
      { id: "b1", afterTimeSlot: 3, durationMinutes: 10 },
    ];
    expect(getBreakMinutesBefore(4, breaks)).toBe(10);
    expect(getBreakMinutesBefore(10, breaks)).toBe(10);
  });

  it("sums multiple breaks", () => {
    const breaks: ScheduleBreak[] = [
      { id: "b1", afterTimeSlot: 2, durationMinutes: 10 },
      { id: "b2", afterTimeSlot: 5, durationMinutes: 15 },
    ];
    expect(getBreakMinutesBefore(3, breaks)).toBe(10);
    expect(getBreakMinutesBefore(6, breaks)).toBe(25);
  });
});

describe("formatTime", () => {
  it("formats time without breaks", () => {
    expect(formatTime(0, "09:00", 20, [])).toBe("09:00");
    expect(formatTime(3, "09:00", 20, [])).toBe("10:00");
  });

  it("offsets time after a break", () => {
    const breaks: ScheduleBreak[] = [
      { id: "b1", afterTimeSlot: 2, durationMinutes: 10 },
    ];
    expect(formatTime(2, "09:00", 20, breaks)).toBe("09:40");
    expect(formatTime(3, "09:00", 20, breaks)).toBe("10:10");
  });

  it("handles multiple breaks", () => {
    const breaks: ScheduleBreak[] = [
      { id: "b1", afterTimeSlot: 1, durationMinutes: 10 },
      { id: "b2", afterTimeSlot: 3, durationMinutes: 15 },
    ];
    expect(formatTime(0, "09:00", 20, breaks)).toBe("09:00");
    expect(formatTime(2, "09:00", 20, breaks)).toBe("09:50");
    expect(formatTime(4, "09:00", 20, breaks)).toBe("10:45");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/engine/time.test.ts`
Expected: FAIL — module `../../engine/time` not found

- [ ] **Step 4: Implement time utils**

Create `src/engine/time.ts`:

```typescript
import type { ScheduleBreak } from "../types";

export function getBreakMinutesBefore(
  slot: number,
  breaks: ScheduleBreak[]
): number {
  let total = 0;
  for (const b of breaks) {
    if (b.afterTimeSlot < slot) total += b.durationMinutes;
  }
  return total;
}

export function formatTime(
  slot: number,
  startTime: string,
  slotDuration: number,
  breaks: ScheduleBreak[]
): string {
  const [h, m] = startTime.split(":").map(Number);
  const total = h * 60 + m + slot * slotDuration + getBreakMinutesBefore(slot, breaks);
  const hours = Math.floor(total / 60).toString().padStart(2, "0");
  const mins = (total % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/engine/time.test.ts`
Expected: All PASS

- [ ] **Step 6: Run typecheck**

Run: `npx tsc -b`
Expected: Type errors in files that reference the old `TournamentConfig` without `breaks`. That's expected — we fix those in subsequent tasks.

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/engine/time.ts src/__tests__/engine/time.test.ts
git commit -m "feat(breaks): add ScheduleBreak type and shared time utils"
```

---

### Task 2: State Management — Reducer & Migration

**Files:**
- Modify: `src/context/TournamentContext.tsx`
- Modify: `src/persistence/localStorage.ts`

- [ ] **Step 1: Update `createDefaultTournament` to include `breaks: []`**

In `src/context/TournamentContext.tsx`, update the config in `createDefaultTournament()`:

```typescript
config: { fieldCount: 3, slotDurationMinutes: 20, startTime: "09:00", breaks: [] },
```

- [ ] **Step 2: Add new action types to `TournamentAction`**

Add the `ScheduleBreak` import:

```typescript
import type {
  Tournament,
  Competition,
  CompetitionConfig,
  TournamentConfig,
  Team,
  Group,
  KnockoutRound,
  ScheduleBreak,
} from "../types";
```

Add three new action variants to `TournamentAction`:

```typescript
| { type: "ADD_BREAK"; breakItem: ScheduleBreak }
| { type: "UPDATE_BREAK"; breakId: string; durationMinutes: number }
| { type: "REMOVE_BREAK"; breakId: string }
```

- [ ] **Step 3: Add reducer cases**

Add before the `case "RESET"` line:

```typescript
case "ADD_BREAK":
  return {
    ...state,
    config: {
      ...state.config,
      breaks: [...state.config.breaks, action.breakItem],
    },
  };

case "UPDATE_BREAK":
  return {
    ...state,
    config: {
      ...state.config,
      breaks: state.config.breaks.map((b) =>
        b.id === action.breakId
          ? { ...b, durationMinutes: action.durationMinutes }
          : b
      ),
    },
  };

case "REMOVE_BREAK":
  return {
    ...state,
    config: {
      ...state.config,
      breaks: state.config.breaks.filter((b) => b.id !== action.breakId),
    },
  };
```

- [ ] **Step 4: Add migration in `loadState`**

In `src/persistence/localStorage.ts`, after the `COMPETITION_NAME_MAP` migration, add a migration for the `breaks` field:

```typescript
if (!state.config.breaks) {
  state.config.breaks = [];
}
```

This goes inside the `try` block, after `const state = JSON.parse(raw) as Tournament;` and before the `return state;`.

- [ ] **Step 5: Run typecheck**

Run: `npx tsc -b`
Expected: Remaining errors in files that still use the old `formatTime` without breaks — those are fixed in later tasks.

- [ ] **Step 6: Commit**

```bash
git add src/context/TournamentContext.tsx src/persistence/localStorage.ts
git commit -m "feat(breaks): add reducer actions and localStorage migration"
```

---

### Task 3: Wire Up Shared `formatTime` Everywhere

**Files:**
- Modify: `src/components/ScheduleGrid.tsx`
- Modify: `src/pages/SetupPage.tsx`
- Modify: `src/persistence/exportImport.ts`

- [ ] **Step 1: Update ScheduleGrid to use shared `formatTime`**

In `src/components/ScheduleGrid.tsx`:

Remove the local `formatTime` function (lines 24-34).

Add import at the top:

```typescript
import { formatTime } from "../engine/time";
import type { ScheduleBreak } from "../types";
```

Add `breaks` to the `Props` type:

```typescript
type Props = {
  matches: ScheduledMatch[];
  fieldCount: number;
  startTime: string;
  slotDurationMinutes: number;
  breaks: ScheduleBreak[];
  teamNames: Map<string, string>;
  onMatchClick: (match: ScheduledMatch) => void;
};
```

Destructure `breaks` in the component and update the `formatTime` call in the time cell:

```typescript
{formatTime(slot, startTime, slotDurationMinutes, breaks)}
```

- [ ] **Step 2: Update SetupPage to use shared `formatTime`**

In `src/pages/SetupPage.tsx`:

Add import:

```typescript
import { formatTime } from "../engine/time";
```

Remove the local `formatTime` function (lines 200-207 inside `SetupPage`).

Update the two calls in the JSX (the estimated slots section) to pass `tournament.config.breaks`:

```typescript
{formatTime(0, tournament.config.startTime, tournament.config.slotDurationMinutes, tournament.config.breaks)}
```

```typescript
{formatTime(estimatedSlots, tournament.config.startTime, tournament.config.slotDurationMinutes, tournament.config.breaks)}
```

- [ ] **Step 3: Update exportImport to use shared `formatTime`**

In `src/persistence/exportImport.ts`:

Remove the local `formatTime` function (lines 50-62).

Add import:

```typescript
import { formatTime } from "../engine/time";
```

Update every `formatTime(...)` call to pass `tournament.config.breaks ?? []` as the fourth argument. There are two call sites (group matches and knockout matches):

```typescript
formatTime(
  match.timeSlot,
  tournament.config.startTime,
  tournament.config.slotDurationMinutes,
  tournament.config.breaks ?? []
)
```

- [ ] **Step 4: Update SchedulePage to pass `breaks` to ScheduleGrid**

In `src/pages/SchedulePage.tsx`, add the `breaks` prop to the `<ScheduleGrid>` call:

```tsx
<ScheduleGrid
  matches={filteredMatches}
  fieldCount={tournament.config.fieldCount}
  startTime={tournament.config.startTime}
  slotDurationMinutes={tournament.config.slotDurationMinutes}
  breaks={tournament.config.breaks}
  teamNames={teamNames}
  onMatchClick={setEditingMatch}
/>
```

- [ ] **Step 5: Run typecheck and tests**

Run: `npx tsc -b && npx vitest run`
Expected: All pass. No type errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/ScheduleGrid.tsx src/pages/SetupPage.tsx src/persistence/exportImport.ts src/pages/SchedulePage.tsx
git commit -m "refactor: replace local formatTime with shared time util"
```

---

### Task 4: Auto-Insert Default Break at Generation

**Files:**
- Modify: `src/pages/SetupPage.tsx`

- [ ] **Step 1: Insert default break after scheduling**

In `src/pages/SetupPage.tsx`, inside `handleGenerate()`, right after the line `const maxGroupSlot = scheduled.reduce(...)` and before `let nextSlot = maxGroupSlot + 1;`, dispatch the break:

```typescript
const maxGroupSlot = scheduled.reduce((max, m) => Math.max(max, m.timeSlot), -1);

if (maxGroupSlot >= 0) {
  dispatch({
    type: "ADD_BREAK",
    breakItem: {
      id: crypto.randomUUID(),
      afterTimeSlot: maxGroupSlot,
      durationMinutes: 10,
    },
  });
}

let nextSlot = maxGroupSlot + 1;
```

- [ ] **Step 2: Clear existing breaks before generating**

At the top of `handleGenerate()`, before the main loop, reset breaks so re-generating doesn't stack them:

```typescript
dispatch({ type: "UPDATE_CONFIG", config: { breaks: [] } });
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc -b`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/SetupPage.tsx
git commit -m "feat(breaks): auto-insert 10min break between groups and knockouts"
```

---

### Task 5: Break Rows in ScheduleGrid

**Files:**
- Modify: `src/components/ScheduleGrid.tsx`
- Modify: `src/pages/SchedulePage.tsx`

- [ ] **Step 1: Add break action callbacks to ScheduleGrid props**

In `src/components/ScheduleGrid.tsx`, update the `Props` type:

```typescript
type Props = {
  matches: ScheduledMatch[];
  fieldCount: number;
  startTime: string;
  slotDurationMinutes: number;
  breaks: ScheduleBreak[];
  teamNames: Map<string, string>;
  onMatchClick: (match: ScheduledMatch) => void;
  onAddBreak: (afterTimeSlot: number) => void;
  onUpdateBreak: (breakId: string, durationMinutes: number) => void;
  onRemoveBreak: (breakId: string) => void;
};
```

Destructure the new props in the component signature.

- [ ] **Step 2: Build a break lookup map**

Inside the component function, after the `grid` Map, create a break lookup:

```typescript
const breakMap = new Map<number, ScheduleBreak>();
for (const b of breaks) {
  breakMap.set(b.afterTimeSlot, b);
}
```

- [ ] **Step 3: Render break rows after each slot row**

Replace the `{slots.map((slot) => (` section in the `<tbody>` with a version that also renders break rows. The full `<tbody>` becomes:

```tsx
<tbody>
  {slots.map((slot, slotIdx) => {
    const schedBreak = breakMap.get(slot);
    const breakStartTime = schedBreak
      ? formatTime(slot + 1, startTime, slotDurationMinutes,
          breaks.filter((b) => b.id !== schedBreak.id))
      : null;
    const breakEndTime = schedBreak
      ? formatTime(slot + 1, startTime, slotDurationMinutes, breaks)
      : null;

    return (
      <Fragment key={slot}>
        <tr>
          <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-600 whitespace-nowrap">
            {formatTime(slot, startTime, slotDurationMinutes, breaks)}
          </td>
          {Array.from({ length: fieldCount }, (_, field) => {
            const match = grid.get(`${slot}-${field}`);
            if (!match) {
              return (
                <td
                  key={field}
                  className="border border-gray-200 px-3 py-2"
                />
              );
            }
            const isWomens = match.competitionId === "womens";
            const badgeClass = isWomens
              ? "bg-pink-100 text-pink-700"
              : "bg-blue-100 text-blue-700";
            const isKnockout = match.phase === "knockout";
            const homeName = match.homeTeamId
              ? (teamNames.get(match.homeTeamId) ?? "?")
              : (match.homeSourceDescription ?? "TBD");
            const awayName = match.awayTeamId
              ? (teamNames.get(match.awayTeamId) ?? "?")
              : (match.awaySourceDescription ?? "TBD");

            const inner = (
              <>
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${badgeClass}`}
                  >
                    {isWomens ? "W" : "M"}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {match.groupName}
                  </span>
                </div>
                <div className="mt-1 text-xs">
                  <span className={isKnockout && !match.homeTeamId ? "italic text-gray-400" : "font-medium"}>
                    {homeName}
                  </span>
                  <span className="mx-1 text-gray-400">
                    {match.score
                      ? `${match.score.home}-${match.score.away}`
                      : "vs"}
                  </span>
                  <span className={isKnockout && !match.awayTeamId ? "italic text-gray-400" : "font-medium"}>
                    {awayName}
                  </span>
                </div>
              </>
            );

            return (
              <td
                key={field}
                className="border border-gray-200 px-2 py-1.5"
              >
                {isKnockout ? (
                  <div className="rounded-lg border border-dashed border-gray-300 p-1.5">
                    {inner}
                  </div>
                ) : (
                  <button
                    onClick={() => onMatchClick(match)}
                    className="w-full rounded-lg p-1.5 text-left transition-colors hover:bg-gray-50"
                  >
                    {inner}
                  </button>
                )}
              </td>
            );
          })}
        </tr>
        {schedBreak && (
          <tr>
            <td
              colSpan={fieldCount + 1}
              className="border border-gray-200 p-0"
            >
              <div className="flex items-center justify-between border-y-2 border-dashed border-yellow-400 bg-yellow-50 px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">☕</span>
                  <span className="text-sm font-semibold text-yellow-800">
                    Pauze
                  </span>
                  <span className="text-xs text-yellow-700">
                    {breakStartTime} – {breakEndTime}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={schedBreak.durationMinutes}
                    onChange={(e) =>
                      onUpdateBreak(
                        schedBreak.id,
                        Math.max(1, Number(e.target.value))
                      )
                    }
                    className="w-14 rounded-md border border-yellow-400 bg-white px-1.5 py-0.5 text-center text-xs"
                  />
                  <span className="text-xs text-yellow-700">min</span>
                  <button
                    onClick={() => onRemoveBreak(schedBreak.id)}
                    className="text-sm text-red-600 opacity-60 hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </td>
          </tr>
        )}
        {slotIdx < slots.length - 1 && !schedBreak && (
          <tr className="group/add">
            <td
              colSpan={fieldCount + 1}
              className="border-0 p-0"
            >
              <div className="relative flex h-0 items-center justify-center overflow-visible">
                <button
                  onClick={() => onAddBreak(slot)}
                  className="absolute z-10 flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-xs text-gray-500 opacity-0 shadow-sm transition-opacity hover:bg-gray-200 group-hover/add:opacity-100"
                >
                  +
                </button>
              </div>
            </td>
          </tr>
        )}
      </Fragment>
    );
  })}
</tbody>
```

Add the `Fragment` import at the top of the file:

```typescript
import { Fragment } from "react";
```

- [ ] **Step 4: Update SchedulePage to pass break callbacks**

In `src/pages/SchedulePage.tsx`, add the import:

```typescript
import type { ScheduleBreak } from "../types";
```

Add the three callback handlers and update the `<ScheduleGrid>` call:

```tsx
<ScheduleGrid
  matches={filteredMatches}
  fieldCount={tournament.config.fieldCount}
  startTime={tournament.config.startTime}
  slotDurationMinutes={tournament.config.slotDurationMinutes}
  breaks={tournament.config.breaks}
  teamNames={teamNames}
  onMatchClick={setEditingMatch}
  onAddBreak={(afterTimeSlot) =>
    dispatch({
      type: "ADD_BREAK",
      breakItem: {
        id: crypto.randomUUID(),
        afterTimeSlot,
        durationMinutes: 10,
      },
    })
  }
  onUpdateBreak={(breakId, durationMinutes) =>
    dispatch({ type: "UPDATE_BREAK", breakId, durationMinutes })
  }
  onRemoveBreak={(breakId) =>
    dispatch({ type: "REMOVE_BREAK", breakId })
  }
/>
```

- [ ] **Step 5: Run typecheck and all tests**

Run: `npx tsc -b && npx vitest run`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add src/components/ScheduleGrid.tsx src/pages/SchedulePage.tsx
git commit -m "feat(breaks): render break rows with edit/delete and hover add button"
```

---

### Task 6: Manual Testing & Polish

**Files:** None new — visual verification only.

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Generate a tournament and verify**

1. Go to Setup, add 8+ teams to each competition
2. Click "Schema genereren & groepen loten"
3. Navigate to Schedule tab
4. Verify: a yellow "Pauze" row appears between last group slot and first knockout slot
5. Verify: knockout times are shifted by 10 minutes relative to what they would be without the break
6. Verify: the break shows the correct time range (e.g., "11:40 – 11:50")

- [ ] **Step 3: Test break editing**

1. Change the break duration input from 10 to 25
2. Verify: all knockout times shift accordingly
3. Verify: the break time range updates (e.g., "11:40 – 12:05")

- [ ] **Step 4: Test break deletion**

1. Click the ✕ button on the break
2. Verify: break row disappears
3. Verify: knockout times snap back to original

- [ ] **Step 5: Test adding a break via hover**

1. Hover between two group-phase rows
2. Verify: "+" button appears
3. Click it
4. Verify: a new 10-min break row appears
5. Verify: all subsequent times shift

- [ ] **Step 6: Test persistence**

1. Refresh the page
2. Verify: breaks are still present

- [ ] **Step 7: Run full test suite and lint**

Run: `npx vitest run && npx tsc -b && npx eslint .`
Expected: All pass

- [ ] **Step 8: Final commit if any polish needed**

Only if fixes were required during testing.
