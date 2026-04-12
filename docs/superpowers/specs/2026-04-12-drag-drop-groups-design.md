# Drag & Drop Team Reordering Between Groups

**Date:** 2026-04-12
**Issue:** #6

## Summary

Allow the admin to manually adjust group assignments by dragging teams between groups on the SetupPage, after the initial random draw and before scheduling.

## Decisions

| Question | Answer |
|----------|--------|
| Move vs swap | Both allowed — simple moves and manual swaps (two moves) |
| Scheduling guard | Disable "Schema genereren" if any group has <3 or >5 teams |
| Where available | SetupPage only, after draw, before schedule generation |
| Drop target | Drop onto group container (not onto specific team) |
| Drag handle | Entire team pill is draggable |
| Library | @dnd-kit/core (~12KB gzipped) |

## Interaction Flow

### Current (single step)

```
Configure → "Schema genereren" (draw + schedule + knockout) → /groups
```

### New (two steps)

```
Configure → "Groepen loten" (draw only) → Drag & Drop preview → "Schema genereren" (schedule + knockout) → /groups
```

The existing "Schema genereren & groepen loten" button splits into two phases:

1. **"Groepen loten"** — shuffles teams into groups, stores result in local component state as a draft
2. **Drag & drop preview** — admin adjusts groups by dragging team pills between group containers
3. **"Schema genereren"** — generates round-robin matches, schedules, knockout rounds, dispatches to context, navigates to /groups

A **"Herloten"** (re-draw) button re-shuffles the draft at any point.

## Components

### DraftGroup type

```typescript
type DraftGroup = { id: string; name: string; teamIds: string[] }
```

Essentially `Group` without `matches` — matches don't exist until confirm.

### GroupDraftEditor

New component rendered on SetupPage when a draft exists. Wraps `@dnd-kit`'s `DndContext` and `DragOverlay`.

**Props:**
- `competitions: Competition[]` — tournament competitions with teams
- `draftGroups: Map<string, DraftGroup[]>` — per-competition group drafts (competition ID → groups)
- `onMove: (competitionId: string, teamId: string, targetGroupId: string) => void`
- `onConfirm: () => void`
- `onRedraw: () => void`
- `isValid: boolean` — whether all groups are in the 3-5 range

**Renders:**
- Per competition: group cards in a 2-column grid (matches existing layout pattern)
- Each group card is a `DroppableGroup`
- Each team pill inside is a `DraggableTeamPill`
- Buttons: "Herloten" + "Schema genereren" (disabled when `!isValid`)
- Warning banner when `!isValid`, naming which groups are out of range

### DraggableTeamPill

Uses `useDraggable` from @dnd-kit/core.

- `id`: team ID
- Renders: team name in a pill matching the existing `rounded-full bg-gray-100 px-3 py-1 text-sm` style, with a subtle grip icon (⠿)
- While dragging: source pill shows as a faded placeholder
- Drag overlay: floating pill with shadow, slight rotation

### DroppableGroup

Uses `useDroppable` from @dnd-kit/core.

- `id`: group ID
- Renders: group card with name, team count, and list of `DraggableTeamPill` children
- When drag is over this group: green border highlight + glow
- When a team is being dragged away: dashed border, reduced opacity

## Data Flow

### On drag end

1. `DndContext.onDragEnd` fires with `active.id` (team ID) and `over.id` (target group ID)
2. If no `over` or target === source group → no-op
3. Update draft state: remove team from source `teamIds`, add to target `teamIds`
4. Re-validate: every group must have ≥3 and ≤5 teams

### On confirm

1. For each competition, dispatch `SET_TEAM_GROUPS` with final draft mappings
2. For each group, call `generateRoundRobinMatches(teamIds, groupId)`
3. Call `scheduleMatches()` across all matches
4. Generate knockout rounds via `generateKnockoutRounds()`
5. Dispatch `SET_GROUPS`, `SET_KNOCKOUT_ROUNDS`, etc.
6. Navigate to `/groups`

This is the existing `handleGenerate()` logic, but reading team assignments from the draft instead of shuffling.

### On re-draw

1. Re-shuffle teams with Fisher-Yates
2. Re-partition into groups based on current group config
3. Replace draft state

## Validation

- Each group must have ≥3 and ≤5 teams
- Validation runs after every drag-end
- Invalid groups: red warning banner listing which groups are out of range
- "Schema genereren" button disabled when invalid
- Groups within the same competition can exchange teams; cross-competition moves are not possible (each competition renders its own `GroupDraftEditor`)

## Styling

All styling via Tailwind, matching existing patterns:

| State | Style |
|-------|-------|
| Team pill (resting) | `rounded-full bg-gray-100 px-3 py-1 text-sm cursor-grab` |
| Team pill (dragging source) | `opacity-30 border-dashed` |
| Drag overlay | `bg-white rounded-full shadow-lg border-2 border-indigo-400 rotate-[-2deg]` |
| Group (resting) | `rounded-xl border border-gray-200 bg-white p-4` |
| Group (drag over) | `border-green-500 bg-green-50 ring-2 ring-green-200` |
| Group (team leaving) | `border-dashed border-red-300` |
| Warning banner | `bg-red-50 border border-red-200 text-red-700` |
| Confirm disabled | `bg-gray-300 text-gray-400 cursor-not-allowed` |

## Dependencies

- `@dnd-kit/core` — drag and drop primitives (DndContext, DragOverlay, useDraggable, useDroppable)
- `@dnd-kit/utilities` — CSS utility for transform (optional, for `CSS.Transform.toString`)

No other new dependencies.

## Out of Scope

- Drag & drop on GroupsPage (only SetupPage)
- Undo/redo beyond re-draw
- Keyboard-only reordering UI (dnd-kit provides basic keyboard sensor support for free)
- Drag reordering within a group (order doesn't matter for round-robin)
- Animations beyond dnd-kit's built-in drag overlay
