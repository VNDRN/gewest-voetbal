# Reset Tournament Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reset button to the header that clears all tournament data after a confirmation modal, with an option to export first.

**Architecture:** Single-file change to `Layout.tsx`. Add a `showResetModal` state, a reset confirmation modal following the existing `ScoreInput` modal pattern, and a red button on the right side of the header. On confirm, call `clearState()`, dispatch `RESET`, and navigate to `/setup`.

**Tech Stack:** React, TypeScript, Tailwind CSS, react-router `useNavigate`

**Spec:** `docs/superpowers/specs/2026-04-13-reset-tournament-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/Layout.tsx` | Modify | Add reset button, modal, state, keyboard handler |

No new files. Existing `clearState()` in `persistence/localStorage.ts` and `RESET` action in `context/TournamentContext.tsx` are already implemented.

---

### Task 1: Add reset button to header

**Files:**
- Modify: `src/components/Layout.tsx:1-114`

- [ ] **Step 1: Add imports**

Add `useState` to the existing React import and add `useNavigate` from react-router:

```tsx
import { NavLink, Outlet, useNavigate } from "react-router-dom";
```

```tsx
import { useRef, useState, useCallback, useEffect } from "react";
```

Add `clearState` import:

```tsx
import { clearState } from "../persistence/localStorage";
```

- [ ] **Step 2: Add state and navigate hook**

Inside the `Layout` component, after the existing `fileInputRef`:

```tsx
const navigate = useNavigate();
const [showResetModal, setShowResetModal] = useState(false);
```

- [ ] **Step 3: Restructure header button layout**

Change the header `div` to split buttons left/right. The current structure has tournament name on the left and all buttons on the right. Change to: tournament name + export/import buttons on the left, reset button on the right.

Replace the header content div:

```tsx
<div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
  <div className="flex items-center gap-4">
    <h1 className="text-xl font-bold">{tournament.name}</h1>
    <div className="flex gap-2">
      <button
        onClick={handleExportJson}
        className="rounded bg-gray-700 px-3 py-1.5 text-sm hover:bg-gray-600"
      >
        Exporteer JSON
      </button>
      <button
        onClick={handleExportCsv}
        className="rounded bg-gray-700 px-3 py-1.5 text-sm hover:bg-gray-600"
      >
        Exporteer CSV
      </button>
      <button
        onClick={handleImport}
        className="rounded bg-gray-700 px-3 py-1.5 text-sm hover:bg-gray-600"
      >
        Importeer
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  </div>
  <button
    onClick={() => setShowResetModal(true)}
    className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
  >
    Reset toernooi
  </button>
</div>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat(ui): add reset tournament button to header (#15)"
```

---

### Task 2: Add confirmation modal

**Files:**
- Modify: `src/components/Layout.tsx`

- [ ] **Step 1: Add reset handler**

After the existing `handleFileChange` function, add:

```tsx
function handleReset() {
  clearState();
  dispatch({ type: "RESET" });
  setShowResetModal(false);
  navigate("/setup");
}

function handleExportAndClose() {
  handleExportJson();
  setShowResetModal(false);
}
```

- [ ] **Step 2: Add Escape key handler**

After the reset handler:

```tsx
const closeResetModal = useCallback(() => setShowResetModal(false), []);

useEffect(() => {
  if (!showResetModal) return;
  function handleKey(e: KeyboardEvent) {
    if (e.key === "Escape") closeResetModal();
  }
  window.addEventListener("keydown", handleKey);
  return () => window.removeEventListener("keydown", handleKey);
}, [showResetModal, closeResetModal]);
```

- [ ] **Step 3: Add modal JSX**

Right before the closing `</div>` of the root `min-h-screen` div (after `</main>`), add:

```tsx
{showResetModal && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    onClick={closeResetModal}
  >
    <div
      className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={closeResetModal}
        className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
      >
        ✕
      </button>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">
        Toernooi resetten?
      </h3>
      <p className="mb-6 text-sm text-gray-500">
        Weet je zeker dat je alle data wilt wissen? Dit kan niet ongedaan
        worden gemaakt.
      </p>
      <div className="flex justify-end gap-3">
        <button
          onClick={handleExportAndClose}
          className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600"
        >
          Exporteer eerst
        </button>
        <button
          onClick={handleReset}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Wis alles
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/components/Layout.tsx`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat(ui): add reset confirmation modal with export option (#15)"
```

---

### Task 3: Manual verification

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify header layout**

Open the app. Confirm:
- Export/import buttons are grouped on the left with the tournament name
- Red "Reset toernooi" button is on the right, visually separated
- All buttons are the same height

- [ ] **Step 3: Verify modal — dismiss paths**

Click "Reset toernooi". Confirm:
- Modal appears with overlay
- Click X button → modal closes
- Reopen, click overlay background → modal closes
- Reopen, press Escape → modal closes

- [ ] **Step 4: Verify modal — export first**

Add some teams/data to the tournament. Click "Reset toernooi", then "Exporteer eerst". Confirm:
- JSON file is downloaded
- Modal closes
- Tournament data is NOT reset

- [ ] **Step 5: Verify modal — reset**

Click "Reset toernooi", then "Wis alles". Confirm:
- App navigates to /setup
- Tournament is completely reset (fresh "Toernooi" name, no teams, default config)
- Refreshing the page keeps the reset state (localStorage was cleared)

- [ ] **Step 6: Final commit if any fixes were needed**

```bash
git add src/components/Layout.tsx
git commit -m "fix(ui): polish reset tournament feature (#15)"
```
