# Reset Tournament with Confirmation Warning

**Issue:** #15
**Date:** 2026-04-13

## Summary

Add a "Reset toernooi" button to the header that clears all tournament state after a confirmation modal warns the user. Includes an "export first" option so users can save before nuking.

## Approach

All changes inline in `src/components/Layout.tsx` — no new files, no new dependencies.

## Header Layout

Restructure the existing header flex container:

- **Left**: Tournament name + export/import button group (unchanged)
- **Right**: Red "Reset toernooi" button, visually separated from the data management buttons

Button styling: `bg-red-600 hover:bg-red-700 text-white`, same sizing as existing buttons (`px-3 py-1.5 text-sm rounded`).

## Confirmation Modal

Triggered by `showResetModal` boolean state. Follows the existing `ScoreInput` modal pattern.

**Structure:**
- Overlay: `fixed inset-0 z-50 flex items-center justify-center bg-black/50`
- Click overlay to close
- Card: `rounded-xl bg-white p-6 shadow-xl` with `stopPropagation`
- X button in top-right corner to dismiss
- Escape key to close

**Content:**
- Title: "Toernooi resetten?"
- Warning: "Weet je zeker dat je alle data wilt wissen? Dit kan niet ongedaan worden gemaakt."
- Two action buttons:
  - "Exporteer eerst" (`bg-gray-700 hover:bg-gray-600`) — triggers existing `handleExportJson()`, then closes modal
  - "Wis alles" (`bg-red-600 hover:bg-red-700`) — destructive action

## Reset Flow (on "Wis alles")

1. Call `clearState()` from `persistence/localStorage.ts`
2. Dispatch `{ type: "RESET" }` action (already exists in reducer)
3. Navigate to `/setup` via `useNavigate()`
4. Close modal

## Files Changed

| File | Change |
|------|--------|
| `src/components/Layout.tsx` | Add reset button, modal JSX, state, keyboard handler, navigate import |

## Acceptance Criteria

- [ ] Red "Reset toernooi" button on the right side of the header
- [ ] Clicking it opens a confirmation modal
- [ ] Modal has X close, click-outside close, Escape close
- [ ] "Exporteer eerst" exports JSON and closes modal
- [ ] "Wis alles" clears state, resets tournament, navigates to /setup
- [ ] Cancelling does nothing
- [ ] After reset, app shows fresh default tournament on setup page
