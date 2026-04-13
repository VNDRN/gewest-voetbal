# Help Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `?` icon button to the right of the four navigation tabs that opens a modal with per-screen help content (intro, options list, next-step pointer) in Dutch.

**Architecture:** One new presentational component (`HelpButton`) renders both the trigger and its modal, re-using the existing reset-modal pattern (overlay + escape-to-close + click-outside close). One new content file (`helpContent.ts`) holds a `Record<route, HelpEntry>` with full Dutch copy for all four routes. `Layout.tsx` mounts the button in the nav row and resolves the current route's entry via `useLocation()`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, react-router-dom v7 (`useLocation`)

**Spec:** `docs/superpowers/specs/2026-04-13-help-button-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/content/helpContent.ts` | Create | Help copy per route (intro, options, next) |
| `src/components/HelpButton.tsx` | Create | `?` trigger button + modal UI |
| `src/components/Layout.tsx` | Modify | Mount `HelpButton` in nav, resolve current route |

No existing component tests in the project (`src/__tests__` only covers engine/persistence). We follow the same pattern: no new component-level unit tests, but add a lightweight data test for `helpContent.ts` to guarantee every route has a non-empty entry.

---

### Task 1: Create help content data file

**Files:**
- Create: `src/content/helpContent.ts`
- Create: `src/__tests__/content/helpContent.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/content/helpContent.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { helpContent } from "../../content/helpContent";

const ROUTES = ["/setup", "/groups", "/schedule", "/knockouts"] as const;

describe("helpContent", () => {
  for (const route of ROUTES) {
    it(`has a non-empty entry for ${route}`, () => {
      const entry = helpContent[route];
      expect(entry).toBeDefined();
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.intro.length).toBeGreaterThan(0);
      expect(entry.options.length).toBeGreaterThan(0);
      expect(entry.next.length).toBeGreaterThan(0);
      for (const option of entry.options) {
        expect(option.label.length).toBeGreaterThan(0);
        expect(option.description.length).toBeGreaterThan(0);
      }
    });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/__tests__/content/helpContent.test.ts`
Expected: FAIL (module `../../content/helpContent` not found)

- [ ] **Step 3: Create the help content file**

Create `src/content/helpContent.ts`:

```ts
export type HelpOption = {
  label: string;
  description: string;
};

export type HelpEntry = {
  title: string;
  intro: string;
  options: HelpOption[];
  next: string;
};

export const helpContent: Record<string, HelpEntry> = {
  "/setup": {
    title: "Instellingen",
    intro: "Start hier. Stel je toernooi in, voeg teams toe en loot de groepen.",
    options: [
      {
        label: "Naam, Datum",
        description: "Toernooi-metadata die terugkomt op exports.",
      },
      {
        label: "Velden",
        description:
          "Aantal speelvelden tegelijk beschikbaar (bepaalt hoeveel matchen parallel lopen).",
      },
      {
        label: "Tijdslot (min)",
        description: "Duur van één wedstrijd-slot inclusief wissel.",
      },
      {
        label: "Starttijd",
        description: "Eerste aftrap van de dag.",
      },
      {
        label: "Teams (per competitie)",
        description:
          'Typ een naam + Enter of "Toevoegen". Klik × om te verwijderen.',
      },
      {
        label: "Groepsindeling",
        description: "Kies hoeveel groepen (min. 6 teams nodig).",
      },
      {
        label: "Doorgang per groep",
        description: "Top N uit elke groep gaat door naar de knock-out.",
      },
      {
        label: "Groepen loten",
        description:
          "Genereert willekeurige groepen, schema én knock-out-bracket. Je kunt de loting herzien voor je bevestigt.",
      },
    ],
    next: "Klaar? Ga naar Groepen om de stand per poule te zien en scores in te vullen.",
  },
  "/groups": {
    title: "Groepen",
    intro: "Volg de stand per groep en vul wedstrijduitslagen in.",
    options: [
      {
        label: "Heren / Dames schakelaar",
        description: "Wissel tussen competities.",
      },
      {
        label: "Groepstabel",
        description:
          "Live stand (punten, doelsaldo). Gekleurde rijen = doorgang. Ster-symbool = beste-volgende-kandidaat.",
      },
      {
        label: "Wedstrijdkaart (klik)",
        description: "Opent scorepopup om uitslag in te vullen of te wijzigen.",
      },
      {
        label: "Beste volgende",
        description:
          "Aparte tabel onderaan als niet alle doorgangplekken direct uit de groep komen.",
      },
    ],
    next: "Vul alle groepswedstrijden in en bekijk dan het volledige tijdschema op Schema.",
  },
  "/schedule": {
    title: "Schema",
    intro:
      "Zie het complete dagschema per veld en tijdslot. Hier start je ook de knock-outfase.",
    options: [
      {
        label: "Filter (Alles / Heren / Dames)",
        description: "Beperk de weergave tot één competitie.",
      },
      {
        label: "Schema-grid",
        description:
          "Rijen = tijdsloten, kolommen = velden. Klik een wedstrijd om de score in te vullen.",
      },
      {
        label: "Pauze toevoegen / aanpassen",
        description:
          "Voeg pauzes in tussen tijdsloten; alle latere tijden schuiven op.",
      },
      {
        label: "Knock-outfase genereren",
        description:
          "Verschijnt zodra alle groepswedstrijden gespeeld zijn. Zet de gekwalificeerde teams in de bracket.",
      },
    ],
    next: "Na de groepsfase: genereer de knock-out en volg de bracket op Knock-out.",
  },
  "/knockouts": {
    title: "Knock-out",
    intro: "Volg de bracket tot en met de finale.",
    options: [
      {
        label: "Filter (Alles / Heren / Dames)",
        description: "Toon één of beide brackets.",
      },
      {
        label: "Bracket",
        description:
          "Klik een wedstrijd om de score (en eventueel penalty's) in te vullen. Winnaars schuiven automatisch door.",
      },
      {
        label: "Kampioen-banner",
        description: "Verschijnt zodra de finale beslist is.",
      },
    ],
    next: "Toernooi afgerond — exporteer de uitslag via de knop bovenaan.",
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/__tests__/content/helpContent.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/content/helpContent.ts src/__tests__/content/helpContent.test.ts
git commit -m "feat(help): add per-route help content data"
```

---

### Task 2: Create HelpButton component

**Files:**
- Create: `src/components/HelpButton.tsx`

- [ ] **Step 1: Create the component file**

Create `src/components/HelpButton.tsx`:

```tsx
import { useCallback, useEffect, useState } from "react";
import type { HelpEntry } from "../content/helpContent";

export default function HelpButton({ entry }: { entry: HelpEntry }) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, close]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Hulp"
        className="ml-auto flex h-9 w-9 cursor-pointer items-center justify-center self-center rounded-full border border-hair text-sm font-bold text-ink-soft transition-colors hover:bg-surface hover:text-ink"
      >
        ?
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={entry.title}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={close}
        >
          <div
            className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Sluiten"
              className="absolute right-4 top-4 cursor-pointer text-ink-muted hover:text-ink"
            >
              ✕
            </button>
            <h3 className="display mb-2 pr-6 text-xl text-ink">{entry.title}</h3>
            <p className="mb-4 text-sm text-ink-soft">{entry.intro}</p>
            <dl className="mb-5 space-y-3">
              {entry.options.map((option) => (
                <div key={option.label}>
                  <dt className="text-sm font-bold text-ink">{option.label}</dt>
                  <dd className="text-sm text-ink-soft">{option.description}</dd>
                </div>
              ))}
            </dl>
            <div className="rounded-lg bg-surface p-3 text-sm text-ink">
              <span className="eyebrow-muted mb-1 block">Volgende stap</span>
              {entry.next}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc -b`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/HelpButton.tsx
git commit -m "feat(help): add HelpButton component with modal"
```

---

### Task 3: Mount HelpButton in Layout nav

**Files:**
- Modify: `src/components/Layout.tsx:1-11` (imports)
- Modify: `src/components/Layout.tsx:130-148` (nav block)

- [ ] **Step 1: Add imports**

At the top of `src/components/Layout.tsx`, update the react-router-dom import to include `useLocation`:

```tsx
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
```

Then add these two imports below the existing imports (after the `clearState` import):

```tsx
import HelpButton from "./HelpButton";
import { helpContent } from "../content/helpContent";
```

- [ ] **Step 2: Resolve current help entry**

Inside the `Layout` component body, after the existing `const [showResetModal, setShowResetModal] = useState(false);` line, add:

```tsx
const location = useLocation();
const helpEntry = helpContent[location.pathname];
```

- [ ] **Step 3: Render the HelpButton in the nav**

Find the existing nav block (around line 130):

```tsx
<nav className="bg-chrome">
  <div className="mx-auto flex max-w-7xl gap-1 px-6">
    {NAV_ITEMS.map(({ to, label }) => (
      <NavLink
        key={to}
        to={to}
        className={({ isActive }) =>
          `-mb-px border-b-[3px] px-4 py-3.5 font-display text-sm font-bold uppercase tracking-widest transition-colors ${
            isActive
              ? "border-brand text-ink"
              : "border-transparent text-ink-soft hover:text-ink"
          }`
        }
      >
        {label}
      </NavLink>
    ))}
  </div>
</nav>
```

Add the `HelpButton` as the last child inside the flex row:

```tsx
<nav className="bg-chrome">
  <div className="mx-auto flex max-w-7xl items-center gap-1 px-6">
    {NAV_ITEMS.map(({ to, label }) => (
      <NavLink
        key={to}
        to={to}
        className={({ isActive }) =>
          `-mb-px border-b-[3px] px-4 py-3.5 font-display text-sm font-bold uppercase tracking-widest transition-colors ${
            isActive
              ? "border-brand text-ink"
              : "border-transparent text-ink-soft hover:text-ink"
          }`
        }
      >
        {label}
      </NavLink>
    ))}
    {helpEntry && <HelpButton entry={helpEntry} />}
  </div>
</nav>
```

Note the added `items-center` on the flex container so the shorter help button aligns vertically with the taller tab links.

- [ ] **Step 4: Run type-check and lint**

Run: `npx tsc -b && npm run lint`
Expected: No errors.

- [ ] **Step 5: Run full test suite**

Run: `npm run test:run`
Expected: All existing tests still pass, new `helpContent` test passes.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`

Open the app in a browser. Verify on each route:
- `/setup` → `?` button visible far right of tab row; clicking opens modal titled "Instellingen" with matching Dutch content
- `/groups` → modal titled "Groepen"
- `/schedule` → modal titled "Schema"
- `/knockouts` → modal titled "Knock-out" with "Volgende stap" showing "Toernooi afgerond — exporteer de uitslag via de knop bovenaan."

On each modal, verify:
- Pressing Escape closes the modal
- Clicking the overlay (outside the panel) closes it
- Clicking `✕` closes it
- Hovering the `?` button shows a pointer cursor
- Modal is scrollable when content overflows on a small viewport

- [ ] **Step 7: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat(help): mount per-tab help button in nav"
```

---

## Verification checklist (all tasks complete)

- [ ] `npm run test:run` passes
- [ ] `npx tsc -b` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Manual check on all four routes (see Task 3 Step 6)
