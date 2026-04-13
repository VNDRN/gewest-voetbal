# Chiro Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the app's generic Tailwind gray/blue palette with a Chiro-branded visual system (palette + typography + component polish), add the SMR logo to the header, and replace the favicon.

**Architecture:** Single source-of-truth design tokens in `src/index.css` via Tailwind v4's `@theme` block → auto-generates utilities (`bg-surface`, `text-ink`, `border-hair`, etc.). Three custom utility classes for type voice (`.display`, `.eyebrow`, `.eyebrow-muted`). Components get restyled in-place — no structural or behavioral changes. One branch, one PR, 9 atomic commits that each keep the app buildable.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind v4 (CSS-first config), Google Fonts (Source Sans 3 + Barlow Condensed), macOS `sips` for favicon generation.

**Spec:** `docs/superpowers/specs/2026-04-13-chiro-visual-redesign-design.md`

**Quality gates per task:** every task ends with `npm run lint && npm run build && npm run test:run` passing, then a commit. Don't skip.

---

## Task 1: Add Chiro design tokens and typography

**Goal:** Load Google Fonts, add the Tailwind v4 `@theme` block with the Chiro palette, add the three type utility classes. Components don't use the tokens yet — this task just makes them available.

**Files:**
- Modify: `index.html` (add Google Fonts `<link>` tags)
- Modify: `src/index.css` (currently just `@import "tailwindcss";`)

- [ ] **Step 1: Add Google Fonts preconnect + stylesheet link to `index.html`**

Current `index.html` head:
```html
<!doctype html>
<html lang="nl">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>voetbaltoernooi</title>
  </head>
```

Edit `index.html` — insert the three font-loading lines between the viewport meta and the title. Leave the favicon line alone for now (Task 2 replaces it):

```html
<!doctype html>
<html lang="nl">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700;900&family=Barlow+Condensed:wght@700;800;900&display=swap" rel="stylesheet" />
    <title>voetbaltoernooi</title>
  </head>
```

- [ ] **Step 2: Rewrite `src/index.css` with the `@theme` block and type utilities**

Current content of `src/index.css`:
```css
@import "tailwindcss";
```

Replace the entire file contents with:

```css
@import "tailwindcss";

@theme {
  /* Chiro brand (huisstijlgids p.18) */
  --color-brand: #E1143C;
  --color-ink: #00124D;
  --color-beige: #E4D096;

  /* Surfaces */
  --color-surface: #FAF7EE;
  --color-card: #FFFFFF;
  --color-chrome: #FFFFFF;

  /* Ink gradient */
  --color-ink-soft: #475785;
  --color-ink-muted: #8A94B3;

  /* Borders */
  --color-hair: #E6E1D2;
  --color-card-hair: #ECE6D7;

  /* Semantic aliases */
  --color-destructive: #E1143C;
  --color-advancing-tint: rgba(0, 18, 77, 0.05);

  /* Team dot palette (setup-screen identity dots) */
  --color-team-red: #E1143C;
  --color-team-navy: #00124D;
  --color-team-orange: #F07A2E;
  --color-team-purple: #7C3F9E;
  --color-team-green: #009640;
  --color-team-teal: #2A9BA8;

  /* Fonts */
  --font-sans: 'Source Sans 3', system-ui, sans-serif;
  --font-display: 'Barlow Condensed', 'Source Sans 3', sans-serif;
}

body {
  font-family: var(--font-sans);
  background: var(--color-surface);
  color: var(--color-ink);
}

.display {
  font-family: var(--font-display);
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.01em;
  line-height: 1;
}

.eyebrow {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 0.75rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-brand);
}

.eyebrow-muted {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 0.75rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}
```

Notes:
- `--color-destructive` is written as its literal hex (not `var(--color-brand)`), because Tailwind v4 needs `@theme` values to be static at build-time for utility generation.
- Only the font weights actually used are requested from Google Fonts.

- [ ] **Step 3: Verify tokens compile into utilities**

Run: `npm run build`
Expected: build succeeds. Tailwind v4 will generate utilities like `bg-surface`, `text-ink`, `border-hair`, `border-card-hair`, `text-brand`, etc. for every color token. Build errors here mean a typo in the `@theme` block.

- [ ] **Step 4: Verify no lint regression**

Run: `npm run lint`
Expected: zero new warnings/errors.

- [ ] **Step 5: Verify tests still pass**

Run: `npm run test:run`
Expected: all existing tests pass (engine/persistence; no visual tests).

- [ ] **Step 6: Commit**

```bash
git add index.html src/index.css
git commit -m "feat(design): add chiro design tokens and typography"
```

---

## Task 2: Add SMR logo and replace favicon

**Goal:** Generate rat-head favicons from `public/SMR.png` via `sips`, swap the `<link rel="icon">` over to the new PNGs, delete the old generic `favicon.svg`. The in-app header logo rendering is done in Task 3.

**Files:**
- Modify: `index.html` (favicon links)
- Create: `public/favicon-32.png`, `public/favicon-192.png`, `public/apple-touch-icon.png`
- Delete: `public/favicon.svg`

**Context:** `public/SMR.png` is 1969×1164. The teal rat with the plaid cap sits roughly in the right third of the image — the rest is SMR calligraphy which is too fine at favicon sizes. We crop the rat head, then downscale to favicon sizes.

- [ ] **Step 1: Crop the rat head from SMR.png into a temp file**

Run:
```bash
sips --cropToHeightWidth 900 900 --cropOffset 130 1050 public/SMR.png --out /tmp/smr-rathead.png
```

`--cropOffset` is `Y X` (sips quirk). These numbers (`y=130, x=1050, 900×900`) are a best-guess based on the teal rat sitting in the right third of the 1969×1164 image. Open `/tmp/smr-rathead.png` in Preview (`open /tmp/smr-rathead.png`) and eyeball it.

**If the rat head isn't reasonably centered:** adjust `--cropOffset 130 1050` — increase first number to crop lower, increase second number to crop further right — and re-run until centered. Don't perfection-chase; a loosely-centered 900×900 crop is fine since the next step downsamples to 32×32 and 192×192 where tiny offsets vanish.

- [ ] **Step 2: Generate the three favicon sizes**

Run:
```bash
sips -z 32 32 /tmp/smr-rathead.png --out public/favicon-32.png
sips -z 192 192 /tmp/smr-rathead.png --out public/favicon-192.png
sips -z 180 180 /tmp/smr-rathead.png --out public/apple-touch-icon.png
```

Verify the three files exist:
```bash
ls -la public/favicon-32.png public/favicon-192.png public/apple-touch-icon.png
```

Open `public/favicon-32.png` in Preview — confirm the rat is legible at tab size. If it's unrecognizable mush, go back to Step 1 and re-crop tighter on the rat head.

- [ ] **Step 3: Update `index.html` favicon links**

Replace this line in `index.html`:
```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

With:
```html
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

- [ ] **Step 4: Delete the old SVG favicon**

Run:
```bash
rm public/favicon.svg
```

No other file references `favicon.svg` (only `index.html` did, and we just changed it).

- [ ] **Step 5: Verify build still works**

Run: `npm run build`
Expected: build succeeds with the new favicons bundled, no references to the deleted `favicon.svg`.

- [ ] **Step 6: Manually verify the favicon in dev**

Run: `npm run dev`, open the app in a browser tab. Verify the rat icon shows in the tab. Kill the dev server with Ctrl+C when done.

- [ ] **Step 7: Commit**

```bash
git add index.html public/favicon-32.png public/favicon-192.png public/apple-touch-icon.png public/favicon.svg
git commit -m "feat(design): add SMR logo favicon and drop generic svg"
```

(`git add public/favicon.svg` stages its deletion.)

---

## Task 3: Restyle Layout header, nav, and reset modal

**Goal:** Apply the new token system to `src/components/Layout.tsx`. White header on cream canvas, SMR logo tile, condensed-display wordmark, brand-red-underlined nav tabs, button system (secondary + ghost-destructive), warm modal.

**Files:**
- Modify: `src/components/Layout.tsx`

**Visual target (from locked-in mockup `direction-d-final-v3`):**
- `bg-surface` canvas behind everything
- White header with `border-b border-hair`, SMR logo in a 44×44 `#0a0a0a` rounded tile next to a `.display` wordmark
- Secondary buttons: white fill, hair border, ink text
- Reset button: ghost-destructive (brand-red text, faint red border, red tint on hover)
- Nav: white band, bold condensed uppercase tabs, 3px brand-red underline on active
- Modal backdrop: `bg-ink/40` (warmer than `black/50`); modal body uses ink/ink-soft text and hair border between sections

- [ ] **Step 1: Replace `Layout.tsx` return JSX**

Read the current `src/components/Layout.tsx` (already done in prep). The hooks + handlers (lines 1–80) stay unchanged. Replace **only the `return (...)`** starting at line 82 through the end of the file (line 187) with:

```tsx
  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-chrome border-b border-hair">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0a0a0a]">
              <img
                src="/SMR.png"
                alt="Gewest Sante Me Ratje"
                className="h-10 w-auto object-contain"
              />
            </div>
            <h1 className="display text-2xl text-ink">{tournament.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportJson}
              className="rounded-lg border border-hair bg-card px-4 py-2 text-sm font-semibold text-ink hover:bg-surface"
            >
              Exporteer JSON
            </button>
            <button
              onClick={handleExportCsv}
              className="rounded-lg border border-hair bg-card px-4 py-2 text-sm font-semibold text-ink hover:bg-surface"
            >
              Exporteer CSV
            </button>
            <button
              onClick={handleImport}
              className="rounded-lg border border-hair bg-card px-4 py-2 text-sm font-semibold text-ink hover:bg-surface"
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
            <button
              onClick={() => setShowResetModal(true)}
              className="rounded-lg border border-brand/25 bg-transparent px-4 py-2 text-sm font-semibold text-brand hover:border-brand hover:bg-brand/5"
            >
              Reset toernooi
            </button>
          </div>
        </div>
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
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
      {showResetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40"
          onClick={closeResetModal}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeResetModal}
              className="absolute right-4 top-4 text-ink-muted hover:text-ink"
            >
              ✕
            </button>
            <h3 className="mb-2 text-lg font-bold text-ink">
              Toernooi resetten?
            </h3>
            <p className="mb-6 text-sm text-ink-soft">
              Weet je zeker dat je alle data wilt wissen? Dit kan niet ongedaan
              worden gemaakt.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleExportAndClose}
                className="rounded-lg border border-hair bg-card px-4 py-2 text-sm font-semibold text-ink hover:bg-surface"
              >
                Exporteer eerst
              </button>
              <button
                onClick={handleReset}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90"
              >
                Wis alles
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

Note: the old `rounded-t` tab style (which produced rounded tops on tabs) is intentionally dropped in favor of the underline-only treatment from the mockup — calmer, more editorial.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: pass. If Tailwind complains about an unknown utility, check that Task 1 landed correctly (the `@theme` block in `src/index.css`).

- [ ] **Step 3: Verify lint and tests**

Run: `npm run lint && npm run test:run`
Expected: both clean.

- [ ] **Step 4: Manual dev check**

Run: `npm run dev` and load the app. Verify:
- White header band, cream canvas below
- SMR rat visible in black tile at left
- `{tournament.name}` renders in condensed bold uppercase
- Nav tabs: bold uppercase, active one has red underline
- Reset button: no fill, red text, faint red border
- Click Reset → modal has warm-navy backdrop, white panel, red "Wis alles" button

Stop dev server (Ctrl+C).

- [ ] **Step 5: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat(design): restyle layout header, nav, and reset modal"
```

---

## Task 4: Restyle match card with emphasized score

**Goal:** Flip the hierarchy — score becomes the hero (4xl black tabular-nums ink), team names become secondary supporting text. The user's #1 complaint.

**Files:**
- Modify: `src/components/MatchCard.tsx`

**Visual target:** card with generous padding; home team right-aligned on the left, giant score center, away team left-aligned on the right. Hover tints to surface cream.

- [ ] **Step 1: Replace `MatchCard.tsx` entirely**

Current content is 30 lines. Replace the full file with:

```tsx
import type { Match } from "../types";

type Props = {
  match: Match;
  teamNames: Map<string, string>;
  onClick: () => void;
};

export default function MatchCard({ match, teamNames, onClick }: Props) {
  const home = teamNames.get(match.homeTeamId) ?? match.homeTeamId;
  const away = teamNames.get(match.awayTeamId) ?? match.awayTeamId;

  const hasPenalties =
    match.score != null &&
    match.score.home === match.score.away &&
    match.score.penHome != null &&
    match.score.penAway != null;

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-5 rounded-2xl border border-card-hair bg-card px-6 py-5 transition-colors hover:bg-surface"
    >
      <span className="flex-1 text-right text-sm font-semibold text-ink-soft">
        {home}
      </span>
      {match.score ? (
        <span className="flex items-baseline gap-2 text-4xl font-black leading-none text-ink tabular-nums">
          <span>{match.score.home}</span>
          <span className="font-medium text-ink-muted">–</span>
          <span>{match.score.away}</span>
          {hasPenalties && (
            <span className="ml-2 text-xs font-semibold text-ink-muted">
              ({match.score.penHome}–{match.score.penAway} pen)
            </span>
          )}
        </span>
      ) : (
        <span className="text-2xl font-black leading-none text-ink-muted">—</span>
      )}
      <span className="flex-1 text-left text-sm font-semibold text-ink-soft">
        {away}
      </span>
    </button>
  );
}
```

- [ ] **Step 2: Verify build + lint + tests**

Run: `npm run lint && npm run build && npm run test:run`
Expected: all clean. No type changes — props shape identical.

- [ ] **Step 3: Manual dev check**

Run: `npm run dev`, navigate to `/groups`. Verify:
- Scores are huge (`text-4xl`) and bold — they're the visual anchor now
- Team names are smaller, muted, flanking the score
- Pending matches show a muted em-dash
- Hover tints to cream

Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add src/components/MatchCard.tsx
git commit -m "feat(design): restyle match card with emphasized score"
```

---

## Task 5: Restyle standings table with navy advancing indicator

**Goal:** Replace `bg-green-50` / `bg-yellow-50` with the navy 5%-opacity tint + muted ▲ glyph + bold team name treatment agreed in the mockup. Wrap the table in a card.

**Files:**
- Modify: `src/components/StandingsTable.tsx`

- [ ] **Step 1: Replace `StandingsTable.tsx` entirely**

Current content is 59 lines. Replace the full file with:

```tsx
import type { StandingRow } from "../types";

type Props = {
  rows: StandingRow[];
  advancingCount: number;
  bestNextPlacedCount: number;
  teamNames: Map<string, string>;
};

export default function StandingsTable({
  rows,
  advancingCount,
  bestNextPlacedCount,
  teamNames,
}: Props) {
  function isQualifying(index: number): boolean {
    if (index < advancingCount) return true;
    if (bestNextPlacedCount > 0 && index === advancingCount) return true;
    return false;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-card-hair bg-card">
      <table className="w-full text-sm text-ink">
        <thead>
          <tr className="eyebrow-muted text-left">
            <th className="px-3 py-3 text-[11px]">#</th>
            <th className="px-3 py-3 text-[11px]">Team</th>
            <th className="px-3 py-3 text-center text-[11px]">GS</th>
            <th className="px-3 py-3 text-center text-[11px]">W</th>
            <th className="px-3 py-3 text-center text-[11px]">G</th>
            <th className="px-3 py-3 text-center text-[11px]">V</th>
            <th className="px-3 py-3 text-center text-[11px]">DV</th>
            <th className="px-3 py-3 text-center text-[11px]">DT</th>
            <th className="px-3 py-3 text-center text-[11px]">DS</th>
            <th className="px-3 py-3 text-center text-[11px]">Ptn</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const qualifying = isQualifying(i);
            const isAdvancing = i < advancingCount;
            return (
              <tr
                key={row.teamId}
                className={`border-t border-card-hair ${qualifying ? "bg-[var(--color-advancing-tint)]" : ""}`}
              >
                <td className="px-3 py-3 font-bold tabular-nums">{i + 1}</td>
                <td className={`px-3 py-3 ${isAdvancing ? "font-bold" : ""}`}>
                  {teamNames.get(row.teamId) ?? row.teamId}
                  {isAdvancing && (
                    <span className="ml-1.5 align-[1px] text-[10px] text-ink-muted">
                      ▲
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-center tabular-nums">{row.played}</td>
                <td className="px-3 py-3 text-center tabular-nums">{row.won}</td>
                <td className="px-3 py-3 text-center tabular-nums">{row.drawn}</td>
                <td className="px-3 py-3 text-center tabular-nums">{row.lost}</td>
                <td className="px-3 py-3 text-center tabular-nums">{row.goalsFor}</td>
                <td className="px-3 py-3 text-center tabular-nums">{row.goalsAgainst}</td>
                <td className="px-3 py-3 text-center tabular-nums">{row.goalDifference}</td>
                <td className="px-3 py-3 text-center font-bold tabular-nums">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Update the legend row on `GroupsPage.tsx`**

The legend at lines 98–105 of `src/pages/GroupsPage.tsx` still uses green/yellow swatches. Replace that block to match the new navy tint system.

Find:
```tsx
      <div className="flex gap-2 text-xs text-gray-500">
        <span className="inline-block h-3 w-3 rounded bg-green-100 border border-green-200" /> Doorgang
        {competition.config.bestNextPlacedCount > 0 && (
          <>
            <span className="ml-2 inline-block h-3 w-3 rounded bg-yellow-100 border border-yellow-200" /> Beste volgende kandidaat
          </>
        )}
      </div>
```

Replace with:
```tsx
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-[var(--color-advancing-tint)] border border-card-hair" />
          <span className="align-[1px] text-[10px] text-ink-muted">▲</span>
          Doorgang
        </span>
        {competition.config.bestNextPlacedCount > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-[var(--color-advancing-tint)] border border-card-hair" />
            Beste volgende kandidaat
          </span>
        )}
      </div>
```

Also update the "Beste volgende" wrapper block at lines 84–96 of `GroupsPage.tsx` — it currently uses `border-yellow-200 bg-yellow-50`. Change:

```tsx
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <h3 className="mb-3 text-base font-semibold">
```

To:
```tsx
        <div className="rounded-2xl border border-card-hair bg-card p-5">
          <h3 className="mb-3 eyebrow">
```

(The `.eyebrow` class already carries color/weight/case — no extra Tailwind utilities needed beyond margin.)

- [ ] **Step 3: Verify build + lint + tests**

Run: `npm run lint && npm run build && npm run test:run`
Expected: clean.

- [ ] **Step 4: Manual dev check**

Run: `npm run dev`, go to `/groups`. Verify:
- Standings wrapped in a card with hair border
- Header row uses eyebrow-muted (tiny condensed uppercase muted-navy)
- Top-N rows have navy 5% tint, team name bold, muted ▲ glyph
- Best-next-placed row (if `bestNextPlacedCount > 0`) has the tint, no ▲
- Legend uses new swatches and correct text colors

Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add src/components/StandingsTable.tsx src/pages/GroupsPage.tsx
git commit -m "feat(design): restyle standings with navy advancing indicator"
```

---

## Task 6: Restyle score input modal

**Goal:** Swap blue focus rings / gray borders for ink + card-hair, replace amber penalty zone with beige, neutralize the "also draw" warning text (it's a state, not a danger).

**Files:**
- Modify: `src/components/ScoreInput.tsx`

- [ ] **Step 1: Replace `ScoreInput.tsx` entirely**

Current content is 152 lines. Replace the full file with:

```tsx
import { useState, useEffect, useCallback } from "react";
import type { Score } from "../types";

type Props = {
  homeTeam: string;
  awayTeam: string;
  initialScore: Score | null;
  isKnockout?: boolean;
  onSave: (score: Score) => void;
  onClose: () => void;
};

export default function ScoreInput({
  homeTeam,
  awayTeam,
  initialScore,
  isKnockout,
  onSave,
  onClose,
}: Props) {
  const [home, setHome] = useState(initialScore?.home ?? 0);
  const [away, setAway] = useState(initialScore?.away ?? 0);
  const [penHome, setPenHome] = useState(initialScore?.penHome ?? 0);
  const [penAway, setPenAway] = useState(initialScore?.penAway ?? 0);

  const isDraw = isKnockout && home === away;
  const penaltyAlsoDraw = isDraw && penHome === penAway;

  const handleSave = useCallback(() => {
    if (isDraw) {
      onSave({ home, away, penHome, penAway });
    } else {
      onSave({ home, away });
    }
  }, [isDraw, home, away, penHome, penAway, onSave]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && !penaltyAlsoDraw) handleSave();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleSave, onClose, penaltyAlsoDraw]);

  const handleSetHome = (val: number) => {
    setHome(val);
    if (isKnockout && val !== away) {
      setPenHome(0);
      setPenAway(0);
    }
  };

  const handleSetAway = (val: number) => {
    setAway(val);
    if (isKnockout && home !== val) {
      setPenHome(0);
      setPenAway(0);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-6 text-center text-lg font-bold text-ink">Score invoeren</h3>
        <div className="flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-semibold text-ink-soft">{homeTeam}</span>
            <input
              type="number"
              min={0}
              value={home}
              onChange={(e) => handleSetHome(Math.max(0, parseInt(e.target.value) || 0))}
              className="h-16 w-20 rounded-lg border-2 border-card-hair text-center text-3xl font-black tabular-nums text-ink focus:border-ink focus:outline-none"
              autoFocus
            />
          </div>
          <span className="text-2xl font-medium text-ink-muted">–</span>
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-semibold text-ink-soft">{awayTeam}</span>
            <input
              type="number"
              min={0}
              value={away}
              onChange={(e) => handleSetAway(Math.max(0, parseInt(e.target.value) || 0))}
              className="h-16 w-20 rounded-lg border-2 border-card-hair text-center text-3xl font-black tabular-nums text-ink focus:border-ink focus:outline-none"
            />
          </div>
        </div>
        {isDraw && (
          <div className="mt-4 border-t-2 border-dashed border-beige/70 pt-4">
            <div className="eyebrow-muted mb-2 text-center">
              Strafschoppen
            </div>
            <div className="flex items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-1">
                <input
                  type="number"
                  min={0}
                  value={penHome}
                  onChange={(e) => setPenHome(Math.max(0, parseInt(e.target.value) || 0))}
                  className="h-12 w-16 rounded-lg border-2 border-beige bg-beige/20 text-center text-2xl font-bold tabular-nums text-ink focus:border-ink focus:outline-none"
                />
              </div>
              <span className="text-xl font-medium text-ink-muted">–</span>
              <div className="flex flex-col items-center gap-1">
                <input
                  type="number"
                  min={0}
                  value={penAway}
                  onChange={(e) => setPenAway(Math.max(0, parseInt(e.target.value) || 0))}
                  className="h-12 w-16 rounded-lg border-2 border-beige bg-beige/20 text-center text-2xl font-bold tabular-nums text-ink focus:border-ink focus:outline-none"
                />
              </div>
            </div>
            {penaltyAlsoDraw && (
              <p className="mt-2 text-center text-xs text-ink-soft">
                Strafschoppen mogen niet gelijk zijn
              </p>
            )}
          </div>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-hair bg-card px-5 py-2 text-sm font-semibold text-ink hover:bg-surface"
          >
            Annuleren
          </button>
          <button
            onClick={handleSave}
            disabled={penaltyAlsoDraw}
            className={`rounded-lg px-5 py-2 text-sm font-semibold text-white ${
              penaltyAlsoDraw
                ? "cursor-not-allowed bg-ink/30"
                : "bg-ink hover:bg-ink/90"
            }`}
          >
            Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build + lint + tests**

Run: `npm run lint && npm run build && npm run test:run`
Expected: clean.

- [ ] **Step 3: Manual dev check**

Run: `npm run dev`, open any match on `/groups`. Verify:
- Modal backdrop is warm navy, not black
- Inputs: hair border, focus ring goes navy
- Save button: ink fill, not blue
- For a drawn knockout match, penalty zone has beige dashed divider + beige-tinted inputs

Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add src/components/ScoreInput.tsx
git commit -m "feat(design): restyle score input modal"
```

---

## Task 7: Restyle setup flow team chips and group drop zones

**Goal:** Beef up the weak team pills on the setup screen (user's #2 complaint), replace green/red drag states with ink/dashed-hair. Also touch the `GroupDraftEditor` buttons and `SetupPage` team chip.

**Files:**
- Modify: `src/components/DraggableTeamPill.tsx`
- Modify: `src/components/DroppableGroup.tsx`
- Modify: `src/components/GroupDraftEditor.tsx`
- Modify: `src/pages/SetupPage.tsx`

- [ ] **Step 1: Replace `DraggableTeamPill.tsx` entirely**

```tsx
import { useDraggable } from "@dnd-kit/core";

export default function DraggableTeamPill({
  id,
  name,
  isDragOverlay,
}: {
  id: string;
  name: string;
  isDragOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
  });

  if (isDragOverlay) {
    return (
      <span className="inline-flex items-center gap-2 -rotate-2 rounded-xl border border-brand bg-card px-4 py-2.5 text-sm font-bold text-ink shadow-lg">
        {name}
      </span>
    );
  }

  return (
    <span
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`inline-flex cursor-grab items-center gap-2 rounded-xl border border-card-hair bg-card px-4 py-2.5 text-sm font-bold text-ink active:cursor-grabbing ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      {name}
    </span>
  );
}
```

Rationale: `rounded-full` → `rounded-xl` (12px square-ish), `bg-gray-100` → `bg-card` with `border border-card-hair`, `text-sm` → `text-sm font-bold text-ink` (was unweighted), padding 12/4 → 16/10. The user explicitly said "I want some more weight to them".

- [ ] **Step 2: Replace `DroppableGroup.tsx` entirely**

```tsx
import { useDroppable } from "@dnd-kit/core";
import DraggableTeamPill from "./DraggableTeamPill";

export default function DroppableGroup({
  id,
  name,
  teamIds,
  teamNames,
  hasDraggingTeam,
}: {
  id: string;
  name: string;
  teamIds: string[];
  teamNames: Map<string, string>;
  hasDraggingTeam: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border-2 p-5 transition-colors ${
        isOver
          ? "border-ink bg-surface"
          : hasDraggingTeam
            ? "border-dashed border-hair bg-card"
            : "border-card-hair bg-card"
      }`}
    >
      <h4 className="display mb-3 text-lg text-ink">
        {name}{" "}
        <span className="ml-1 text-xs font-semibold tracking-wider text-ink-muted">
          ({teamIds.length} teams)
        </span>
      </h4>
      <div className="flex flex-wrap gap-2">
        {teamIds.map((teamId) => (
          <DraggableTeamPill
            key={teamId}
            id={teamId}
            name={teamNames.get(teamId) ?? teamId}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update `GroupDraftEditor.tsx` button row and error strip**

Find the error block at lines 88–94:
```tsx
      {allErrors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {allErrors.map((err, i) => (
            <p key={i}>⚠️ {err}</p>
          ))}
        </div>
      )}
```

Replace with:
```tsx
      {allErrors.length > 0 && (
        <div className="rounded-xl border border-brand/25 bg-brand/5 p-3 text-sm text-brand">
          {allErrors.map((err, i) => (
            <p key={i}>⚠️ {err}</p>
          ))}
        </div>
      )}
```

Find the competition header at line 112:
```tsx
              <h3 className="mb-3 text-base font-semibold">{comp.name}</h3>
```

Replace with:
```tsx
              <h3 className="display mb-3 text-xl text-ink">{comp.name}</h3>
```

Find the two buttons at lines 140–154:
```tsx
      <div className="flex gap-3">
        <button
          onClick={onRedraw}
          className="flex-1 rounded-xl border border-indigo-200 bg-indigo-50 py-3 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
        >
          🔄 Herloten
        </button>
        <button
          onClick={onConfirm}
          disabled={!isValid}
          className="flex-[2] rounded-xl bg-green-600 py-3 text-lg font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-400"
        >
          Schema genereren
        </button>
      </div>
```

Replace with:
```tsx
      <div className="flex gap-3">
        <button
          onClick={onRedraw}
          className="flex-1 rounded-xl border border-hair bg-card py-3 text-sm font-semibold text-ink hover:bg-surface"
        >
          🔄 Herloten
        </button>
        <button
          onClick={onConfirm}
          disabled={!isValid}
          className="flex-[2] rounded-xl bg-ink py-3 text-lg font-bold text-white hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-ink/30"
        >
          Schema genereren
        </button>
      </div>
```

- [ ] **Step 4: Update `SetupPage.tsx` — form panels, inputs, buttons, team chips, notification blocks**

Multiple small swaps. Work top-to-bottom through the file.

**4a.** `CompetitionSetup` card container (line 82):
```tsx
    <div className="rounded-xl border border-gray-200 bg-white p-5">
```
Replace with:
```tsx
    <div className="rounded-2xl border border-card-hair bg-card p-5">
```

**4b.** `CompetitionSetup` heading (line 83):
```tsx
      <h3 className="mb-4 text-lg font-semibold">{competition.name}</h3>
```
Replace with:
```tsx
      <h3 className="display mb-4 text-xl text-ink">{competition.name}</h3>
```

**4c.** All `<label>` uses of `text-gray-700` inside this file. Replace every occurrence of:
```tsx
className="mb-1 block text-sm font-medium text-gray-700"
```
with:
```tsx
className="eyebrow-muted mb-1 block"
```
(There are 7 labels in this file — use Edit with `replace_all: true`.)

**4d.** All text `<input>` / `<select>` utility strings in this file. Replace every occurrence of:
```
rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none
```
with:
```
rounded-lg border border-card-hair bg-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none
```
(6 occurrences — use `replace_all: true`.)

**4e.** The "Toevoegen" add-team button at line 100:
```tsx
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
```
Replace with:
```tsx
            className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/90"
```

**4f.** The rendered team chip at lines 108–119:
```tsx
              <span
                key={t.id}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm"
              >
                {t.name}
                <button
                  onClick={() => removeTeam(t.id)}
                  className="ml-1 text-gray-400 hover:text-red-500"
                >
                  &times;
                </button>
              </span>
```
Replace with:
```tsx
              <span
                key={t.id}
                className="inline-flex items-center gap-2 rounded-xl border border-card-hair bg-card px-4 py-2.5 text-sm font-bold text-ink"
              >
                {t.name}
                <button
                  onClick={() => removeTeam(t.id)}
                  className="ml-1 text-ink-muted hover:text-brand"
                >
                  &times;
                </button>
              </span>
```

**4g.** The knockout-summary strip at lines 177–189:
```tsx
        <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
```
Replace with:
```tsx
        <div className="mt-4 rounded-lg bg-surface p-3 text-sm text-ink-soft">
```

**4h.** The "minstens 6 teams nodig" note at line 192:
```tsx
        <p className="mt-3 text-sm text-amber-600">
```
Replace with:
```tsx
        <p className="mt-3 text-sm text-ink-soft">
```

**4i.** The tournament-settings card at line 387:
```tsx
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold">Toernooi-instellingen</h2>
```
Replace with:
```tsx
      <div className="rounded-2xl border border-card-hair bg-card p-5">
        <h2 className="display mb-4 text-xl text-ink">Toernooi-instellingen</h2>
```

**4j.** Estimated-slots strip at line 480:
```tsx
        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
```
Replace with:
```tsx
        <div className="rounded-xl border border-card-hair bg-surface p-4 text-sm text-ink-soft">
```

**4k.** The final "Groepen loten" button at line 500:
```tsx
        <button
          onClick={handleDraw}
          disabled={!canGenerate}
          className="w-full rounded-xl bg-green-600 py-3 text-lg font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
```
Replace with:
```tsx
        <button
          onClick={handleDraw}
          disabled={!canGenerate}
          className="w-full rounded-xl bg-ink py-3 text-lg font-bold text-white hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-ink/30"
        >
```

- [ ] **Step 5: Verify build + lint + tests**

Run: `npm run lint && npm run build && npm run test:run`
Expected: clean. If lint complains, check that each `replace_all` didn't miss a spot.

- [ ] **Step 6: Manual dev check**

Run: `npm run dev`, go to `/setup`. Verify:
- Settings card: cream border, white fill, display-uppercase heading
- Labels: condensed muted uppercase eyebrows
- Inputs: hair borders, navy focus
- "Toevoegen" button: ink-fill, not blue
- Added team chips: chunky (rounded-xl, 16px padding), bold ink text, hair border
- Click "Groepen loten" → group cards have display headings, chunky team pills
- Drag a team → overlay has brand-red border + rotation, drop targets show ink border on hover

Stop dev server.

- [ ] **Step 7: Commit**

```bash
git add src/components/DraggableTeamPill.tsx src/components/DroppableGroup.tsx src/components/GroupDraftEditor.tsx src/pages/SetupPage.tsx
git commit -m "feat(design): restyle setup flow team chips and drop zones"
```

---

## Task 8: Restyle competition toggle, schedule grid, bracket view

**Goal:** Clean up the remaining three visual components. The toggle component is shared by GroupsPage; SchedulePage + KnockoutPage have inline copies of the same toggle that also get updated.

**Files:**
- Modify: `src/components/CompetitionToggle.tsx`
- Modify: `src/components/ScheduleGrid.tsx`
- Modify: `src/components/BracketView.tsx`
- Modify: `src/pages/SchedulePage.tsx` (inline toggle + container + button)
- Modify: `src/pages/KnockoutPage.tsx` (inline toggle + container + champion banner)

- [ ] **Step 1: Replace `CompetitionToggle.tsx` entirely**

```tsx
type Props = {
  activeId: string;
  onChange: (id: string) => void;
};

const COMPETITIONS = [
  { id: "mens", label: "Heren" },
  { id: "womens", label: "Dames" },
] as const;

export default function CompetitionToggle({ activeId, onChange }: Props) {
  return (
    <div className="inline-flex rounded-xl bg-surface p-1">
      {COMPETITIONS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
            activeId === id
              ? "bg-card text-ink shadow-sm"
              : "text-ink-soft hover:text-ink"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Replace `ScheduleGrid.tsx` class strings**

The file's logic is fine; only styling changes. Edit these eight utility strings in-place (leave all JSX structure and logic untouched):

- Time header cell (line 62): `className="border border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-500"` → `className="eyebrow-muted border border-card-hair bg-surface px-3 py-2 text-left text-[11px]"`
- Field header cells (line 68): `className="border border-gray-200 bg-gray-50 px-3 py-2 text-center text-xs font-medium text-gray-500"` → `className="eyebrow-muted border border-card-hair bg-surface px-3 py-2 text-center text-[11px]"`
- Time label row cell (line 89): `className="border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-600 whitespace-nowrap"` → `className="border border-card-hair bg-surface px-3 py-2 text-xs font-semibold text-ink-soft tabular-nums whitespace-nowrap"`
- Empty-slot cell (line 98): `className="border border-gray-200 px-3 py-2"` → `className="border border-card-hair px-3 py-2"`
- Badge class: the whole ternary at lines 103–105 (`isWomens ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"`) → `isWomens ? "bg-brand/10 text-brand" : "bg-ink/10 text-ink"`
- Group name text (line 122): `className="text-[10px] text-gray-400"` → `className="text-[10px] text-ink-muted"`
- Dash between teams (line 130): `className="mx-1 text-gray-400"` → `className="mx-1 text-ink-muted"`
- TBD italic spans (lines 127, 135): `"italic text-gray-400"` → `"italic text-ink-muted"` (two occurrences)
- Match cell wrapper (line 147): `className="border border-gray-200 px-2 py-1.5"` → `className="border border-card-hair px-2 py-1.5"`
- Clickable match button (line 152): `className={\`w-full rounded-lg p-1.5 text-left transition-colors hover:bg-gray-50 ${...}\`}` → `className={\`w-full rounded-lg p-1.5 text-left transition-colors hover:bg-surface ${...}\`}` and inside the conditional: `"border border-dashed border-gray-300"` → `"border border-dashed border-card-hair"`
- Non-clickable knockout cell (line 159): `className="rounded-lg border border-dashed border-gray-300 p-1.5"` → `className="rounded-lg border border-dashed border-card-hair p-1.5"`
- Break row outer cell (line 171): `className="border border-gray-200 p-0"` → `className="border border-card-hair p-0"`
- Break bar (line 173): `className="flex items-center justify-between border-y-2 border-dashed border-yellow-400 bg-yellow-50 px-4 py-2.5"` → `className="flex items-center justify-between border-y-2 border-dashed border-beige bg-beige/20 px-4 py-2.5"`
- Break label (line 176): `className="text-sm font-semibold text-yellow-800"` → `className="text-sm font-bold text-ink"`
- Break time range (line 179): `className="text-xs text-yellow-700"` → `className="text-xs text-ink-soft"`
- Break duration input (line 194): `className="w-14 rounded-md border border-yellow-400 bg-white px-1.5 py-0.5 text-center text-xs"` → `className="w-14 rounded-md border border-beige bg-card px-1.5 py-0.5 text-center text-xs tabular-nums text-ink"`
- "min" suffix (line 196): `className="text-xs text-yellow-700"` → `className="text-xs text-ink-soft"`
- Remove break button (line 199): `className="text-sm text-red-600 opacity-60 hover:opacity-100"` → `className="text-sm text-brand opacity-60 hover:opacity-100"`
- Add-break row hover (line 216): `className="flex h-6 w-full cursor-pointer items-center justify-center transition-colors hover:bg-gray-50"` → `className="flex h-6 w-full cursor-pointer items-center justify-center transition-colors hover:bg-surface"`
- Add-break glyph (line 218): `className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-xs text-gray-500 opacity-0 shadow-sm transition-opacity group-hover/add:opacity-100"` → `className="flex h-5 w-5 items-center justify-center rounded-full border border-card-hair bg-surface text-xs text-ink-muted opacity-0 shadow-sm transition-opacity group-hover/add:opacity-100"`

- [ ] **Step 3: Update `BracketView.tsx` class strings**

Edit in-place:

- `MatchSlot` button (line 44):
  ```tsx
      className={`w-48 rounded-lg border p-2 text-left text-xs transition-colors ${
        canClick
          ? "border-gray-300 bg-white hover:border-blue-400 hover:shadow-sm cursor-pointer"
          : "border-dashed border-gray-200 bg-gray-50 cursor-default"
      }`}
  ```
  Replace with:
  ```tsx
      className={`w-48 rounded-xl border p-3 text-left text-xs transition-colors ${
        canClick
          ? "border-card-hair bg-card hover:border-ink hover:shadow-sm cursor-pointer"
          : "border-dashed border-card-hair bg-surface cursor-default"
      }`}
  ```

- Team name span (lines 51, 67):
  ```tsx
          <span className={`font-medium ${!match.homeTeamId ? "text-gray-400 italic" : ""}`}>
  ```
  Replace with:
  ```tsx
          <span className={`font-semibold text-ink ${!match.homeTeamId ? "italic text-ink-muted" : ""}`}>
  ```
  (Two occurrences — home and away; the `home` / `away` variable differs. Update both.)

- Winner/loser score spans (lines 56, 72):
  ```tsx
            <span className={`font-bold ${homeWins ? "text-green-600" : "text-gray-500"}`}>
  ```
  Replace with:
  ```tsx
            <span className={`font-black tabular-nums ${homeWins ? "text-ink" : "text-ink-muted"}`}>
  ```
  (Two occurrences — home and away. Apply same transform to the `awayWins` variant.)

- Penalty score spans (lines 60, 75):
  ```tsx
              <span className="text-[10px] font-semibold text-amber-600">({match.score!.penHome})</span>
  ```
  Replace with:
  ```tsx
              <span className="text-[10px] font-semibold text-ink-muted">({match.score!.penHome})</span>
  ```
  (Two occurrences — penHome and penAway.)

- Divider between teams (line 65):
  ```tsx
      <div className="my-0.5 border-t border-gray-100" />
  ```
  Replace with:
  ```tsx
      <div className="my-1 border-t border-card-hair" />
  ```

- Round ID eyebrow (line 81):
  ```tsx
      <div className="mt-1 text-[10px] text-gray-400">
  ```
  Replace with:
  ```tsx
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
  ```

- Round column heading (line 103):
  ```tsx
      <h4 className="mb-3 text-sm font-semibold text-gray-700">{name}</h4>
  ```
  Replace with:
  ```tsx
      <h4 className="eyebrow mb-3">{name}</h4>
  ```

- [ ] **Step 4: Update `SchedulePage.tsx` — inline toggle + schedule card + generate button + empty state**

In `src/pages/SchedulePage.tsx`:

Replace the inline toggle at lines 152–170:
```tsx
      <div className="inline-flex rounded-lg bg-gray-200 p-1">
        {([
          { id: "all", label: "Alles" },
          { id: "mens", label: "Heren" },
          { id: "womens", label: "Dames" },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
```
With:
```tsx
      <div className="inline-flex rounded-xl bg-surface p-1">
        {([
          { id: "all", label: "Alles" },
          { id: "mens", label: "Heren" },
          { id: "womens", label: "Dames" },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
              filter === id
                ? "bg-card text-ink shadow-sm"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
```

Replace the schedule card wrapper at line 172:
```tsx
      <div className="rounded-xl border border-gray-200 bg-white p-4">
```
With:
```tsx
      <div className="rounded-2xl border border-card-hair bg-card p-4">
```

Replace the generate-bracket button at line 209:
```tsx
                  className="w-full rounded-xl bg-green-600 py-3 text-lg font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
```
With:
```tsx
                  className="w-full rounded-xl bg-ink py-3 text-lg font-bold text-white hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-ink/30"
```

Replace the empty-state block at lines 142–147:
```tsx
  if (allMatches.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
        Nog geen schema. Genereer de loting vanuit Instellingen.
      </div>
    );
  }
```
With:
```tsx
  if (allMatches.length === 0) {
    return (
      <div className="rounded-2xl border border-card-hair bg-card p-8 text-center text-ink-soft">
        Nog geen schema. Genereer de loting vanuit Instellingen.
      </div>
    );
  }
```

- [ ] **Step 5: Update `KnockoutPage.tsx` — inline toggle + empty state + bracket card + champion banner**

In `src/pages/KnockoutPage.tsx`:

Replace the inline toggle at lines 38–56 with the same navy/card/surface treatment as Schedule (same block as Step 4 above, swap `setFilter` → `setActiveComp` and `filter` → `activeComp`):
```tsx
      <div className="inline-flex rounded-xl bg-surface p-1">
        {([
          { id: "all", label: "Alles" },
          { id: "mens", label: "Heren" },
          { id: "womens", label: "Dames" },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveComp(id)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
              activeComp === id
                ? "bg-card text-ink shadow-sm"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
```

Replace the `<h3>` at line 89:
```tsx
            {activeComp === "all" && (
              <h3 className="text-lg font-semibold">{comp.name}</h3>
            )}
```
With:
```tsx
            {activeComp === "all" && (
              <h3 className="display text-2xl text-ink">{comp.name}</h3>
            )}
```

Replace the champion banner at lines 92–102:
```tsx
            {champion && (
              <div className="rounded-xl border-2 border-yellow-400 bg-yellow-50 p-6 text-center">
                <div className="text-4xl">🏆</div>
                <div className="mt-2 text-2xl font-bold text-yellow-800">
                  {champion}
                </div>
                <div className="text-sm text-yellow-600">
                  {comp.name} Kampioen
                </div>
              </div>
            )}
```
With:
```tsx
            {champion && (
              <div className="rounded-2xl border border-beige bg-beige/20 p-6 text-center">
                <div className="text-4xl">🏆</div>
                <div className="display mt-2 text-3xl text-ink">{champion}</div>
                <div className="eyebrow mt-1">{comp.name} Kampioen</div>
              </div>
            )}
```

Replace the bracket card wrapper and empty state at lines 104–125:
```tsx
            {rounds.length > 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <BracketView
                  rounds={rounds}
                  teamNames={teamNames}
                  onMatchClick={
                    isSeeded
                      ? (match, roundIndex) =>
                          setEditingMatch({
                            match,
                            roundIndex,
                            compId: comp.id,
                          })
                      : () => {}
                  }
                />
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
                Nog geen groepen. Genereer eerst de loting vanuit Instellingen.
              </div>
            )}
```
With:
```tsx
            {rounds.length > 0 ? (
              <div className="rounded-2xl border border-card-hair bg-card p-4">
                <BracketView
                  rounds={rounds}
                  teamNames={teamNames}
                  onMatchClick={
                    isSeeded
                      ? (match, roundIndex) =>
                          setEditingMatch({
                            match,
                            roundIndex,
                            compId: comp.id,
                          })
                      : () => {}
                  }
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-card-hair bg-card p-8 text-center text-ink-soft">
                Nog geen groepen. Genereer eerst de loting vanuit Instellingen.
              </div>
            )}
```

- [ ] **Step 6: Also update `GroupsPage.tsx` group card wrapper and empty state**

In `src/pages/GroupsPage.tsx`:

Replace the empty-state block at lines 42–46:
```tsx
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          Nog geen groepen. Ga naar Instellingen om de loting te genereren.
        </div>
```
With:
```tsx
        <div className="rounded-2xl border border-card-hair bg-card p-8 text-center text-ink-soft">
          Nog geen groepen. Ga naar Instellingen om de loting te genereren.
        </div>
```

Replace the group card wrapper at lines 58–62:
```tsx
            <div
              key={group.id}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <h3 className="mb-3 text-base font-semibold">{group.name}</h3>
```
With:
```tsx
            <div
              key={group.id}
              className="rounded-2xl border border-card-hair bg-card p-5"
            >
              <h3 className="display mb-4 text-xl text-ink">{group.name}</h3>
```

- [ ] **Step 7: Verify build + lint + tests**

Run: `npm run lint && npm run build && npm run test:run`
Expected: clean.

- [ ] **Step 8: Manual dev check**

Run: `npm run dev`. Walk every page:
- `/setup` — toggle, panels, inputs all themed
- `/groups` — toggle uses new treatment, group cards rounded-2xl with display headings
- `/schedule` — headers as eyebrows, break bars beige, badges navy/brand
- `/knockouts` — bracket match cards with ink hover, round headers as red eyebrows, champion banner in beige with display name
- Competition toggle feels consistent across Groups/Schedule/Knockout

Stop dev server.

- [ ] **Step 9: Commit**

```bash
git add src/components/CompetitionToggle.tsx src/components/ScheduleGrid.tsx src/components/BracketView.tsx src/pages/SchedulePage.tsx src/pages/KnockoutPage.tsx src/pages/GroupsPage.tsx
git commit -m "feat(design): restyle competition toggle, schedule grid, bracket view"
```

---

## Task 9: Apply Chiro type system to page titles and audit residual gray/blue

**Goal:** Sweep for remaining un-themed utilities across the pages. Titles get `.display`, section labels get `.eyebrow`, any overlooked `text-gray-*` / `bg-blue-*` gets replaced with tokens.

**Files:**
- Modify: any page/component still containing a `text-gray-*`, `bg-gray-*`, `text-blue-*`, `bg-blue-*`, `text-green-*`, `bg-green-*`, `text-yellow-*`, `bg-yellow-*`, `text-red-*`, `bg-red-*`, `border-gray-*`, `border-blue-*`, `border-green-*`, `border-yellow-*`, `border-red-*` reference in `src/`.

**Context:** Tasks 3–8 replaced the vast majority of these in-context. This task is a final audit + polish. Anything that remains should either be (a) explicitly mapped to a token, or (b) intentionally kept (e.g., status emoji colors — there aren't any in this codebase, but mention if found).

- [ ] **Step 1: Scan for residual Tailwind palette utilities under `src/`**

Run:
```bash
grep -REn "text-(gray|blue|green|yellow|red|amber|pink|indigo)-[0-9]+|bg-(gray|blue|green|yellow|red|amber|pink|indigo)-[0-9]+|border-(gray|blue|green|yellow|red|amber|pink|indigo)-[0-9]+" src/
```

Review each hit. For every result that's still present after Tasks 3–8, apply the mapping table below and edit the file(s).

**Mapping table (reference; most cases already covered in prior tasks but may still appear):**

| Old | New |
|---|---|
| `text-gray-900` / `text-gray-800` | `text-ink` |
| `text-gray-700` / `text-gray-600` | `text-ink-soft` |
| `text-gray-500` / `text-gray-400` | `text-ink-muted` |
| `text-gray-300` | `text-ink-muted` |
| `bg-gray-50` | `bg-surface` |
| `bg-gray-100` | `bg-surface` |
| `bg-gray-200` | `bg-surface` |
| `bg-gray-700` / `bg-gray-600` | `bg-card border border-hair` (was secondary button — use secondary-button recipe) |
| `bg-gray-900` | `bg-ink` (but usually header — replaced in Task 3) |
| `border-gray-200` / `border-gray-100` | `border-card-hair` |
| `border-gray-300` | `border-hair` |
| `bg-blue-50` | `bg-surface` |
| `bg-blue-100` | `bg-ink/10` |
| `bg-blue-600` / `bg-blue-700` | `bg-ink` / `bg-ink/90` |
| `text-blue-*` | `text-ink` |
| `border-blue-*` | `border-ink` |
| `bg-green-600` / `bg-green-700` (primary action) | `bg-ink` / `bg-ink/90` |
| `bg-green-50` / `text-green-*` | `bg-[var(--color-advancing-tint)]` / `text-ink` (depending on context) |
| `bg-yellow-50` / `border-yellow-*` | `bg-beige/20` / `border-beige` |
| `text-amber-*` / `bg-amber-*` | `text-ink-soft` / `bg-beige/20` |
| `bg-red-50` / `border-red-*` / `text-red-*` | `bg-brand/5` / `border-brand/25` / `text-brand` |
| `bg-red-600` | `bg-brand` (destructive confirm button only) |
| `bg-pink-100 text-pink-700` (women's badge) | `bg-brand/10 text-brand` |
| `text-indigo-*` / `border-indigo-*` / `bg-indigo-*` | `text-ink` / `border-hair` / `bg-card` |

Edit in-place. Keep it pragmatic: if the mapping table above doesn't cover a real case cleanly, fall back to: `text-*` → `text-ink-soft`, `bg-*` → `bg-surface`, `border-*` → `border-card-hair`.

- [ ] **Step 2: Apply `.display` treatment to the page-level section headers that still render as plain `<h3>` / `<h2>`**

Scan `src/pages/` for any remaining `text-lg font-semibold` or `text-base font-semibold` headings and swap their classes to `.display text-xl text-ink` (for page subsections) or `.eyebrow` (for small section labels — e.g., legend-style captions).

Most of these were already updated in Tasks 3–8, but do a final pass:

```bash
grep -REn "text-(lg|base|xl|2xl) font-semibold" src/pages/ src/components/
```

Review and normalize.

- [ ] **Step 3: Verify nothing visual was broken**

Run: `npm run lint && npm run build && npm run test:run`
Expected: clean.

- [ ] **Step 4: Full manual dev walkthrough (the Section 4 checklist from the spec)**

Run: `npm run dev`. Click through every flow end-to-end:

1. **`/setup`**
   - Type in tournament name, date, fields — inputs behave correctly
   - Add a team by typing + Enter — chunky chip appears
   - Remove a team by × — chip disappears
   - Pick a group option — knockout summary strip shows
   - Click "Groepen loten" — draft editor appears with chunky pills in dashed drop zones
   - Drag a team between groups — red-outlined overlay, ink-outlined hover target
   - Click "Schema genereren"
2. **`/groups`**
   - Each group card: display heading, standings table with navy tint on advancing, ▲ glyph, bold names
   - Best-next-placed block (if applicable) has tint without ▲
   - Click a match card — `ScoreInput` modal opens with navy backdrop, hair inputs, ink focus
   - Enter a score, Save — match card flips to showing 4xl black score
3. **`/schedule`**
   - Grid: eyebrow headers, beige break bars
   - Hover a match — cream wash
   - Add a break via the + affordance — beige bar shows
   - Remove break — disappears
4. **`/knockouts`**
   - Bracket renders with red round-headers, hair-bordered match cards
   - After completing all group matches and clicking "generate bracket", teams seed correctly
   - Final match complete → champion banner in beige with display name
5. **Header**
   - SMR logo on black tile, wordmark in display uppercase
   - Export JSON / Export CSV / Import work
   - Reset flow: ghost-destructive button → navy backdrop modal → "Exporteer eerst" downloads, "Wis alles" wipes state and sends to `/setup`
6. **Favicon** — visible in browser tab as rat
7. **Fonts** — verify Source Sans 3 is loaded (network tab), Barlow Condensed renders on all `.display`/`.eyebrow` elements (open DevTools and confirm computed `font-family`)

Note any issues and fix before closing the task.

Stop dev server.

- [ ] **Step 5: Run a final ripgrep for tokens-outside-the-theme that might've snuck in**

```bash
grep -REn "#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}\b" src/ --include="*.tsx" --include="*.ts"
```

Any hex colors in component files (outside `src/index.css`) should be justified — the only acceptable one in this refactor is the `#0a0a0a` logo tile background in `Layout.tsx` (since the SMR.png has a black bg that needs to match). Anything else = replace with a token.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(design): apply chiro type system to pages and audit residuals"
```

---

## Optional: open the PR

After Task 9 is clean and pushed:

```bash
git push -u origin <branch-name>
gh pr create --title "feat(design): Chiro visual redesign" --body "$(cat <<'EOF'
## Summary
- Replaces the generic gray/blue Tailwind palette with Chiro-branded tokens (red accent, navy ink, cream surface, beige support) via Tailwind v4 `@theme`
- Introduces condensed-display type voice (Source Sans 3 + Barlow Condensed) via `.display`, `.eyebrow`, `.eyebrow-muted` utility classes
- Emphasizes match scores (4xl black tabular-nums ink) over team names — the user's #1 complaint
- Chunky team chips on setup screen (was weak full-rounded gray pills)
- Navy-tinted advancing rows + muted ▲ glyph + bold name (dropped semantically-wrong red/green)
- Ghost-destructive reset button in header; solid brand fill only inside confirm modal
- SMR rat logo in header + rat-head favicon (replaces generic purple SVG)

Closes VNDRN/gewest-voetbal#1

## Test plan
- [ ] `npm run lint && npm run build && npm run test:run` all green
- [ ] SMR rat visible in header on black tile + browser tab favicon
- [ ] Match cards show 4xl scores as the visual anchor
- [ ] Advancing rows have navy tint + muted ▲ glyph + bold team name
- [ ] Setup screen team chips are chunky and bold
- [ ] Reset flow: ghost trigger → navy-backdrop modal → brand-filled "Wis alles" confirm works
- [ ] Walk every page in dev to confirm no residual gray/blue utilities
EOF
)"
```

---

## Self-review notes (author's check after writing the plan)

- **Spec coverage:** Section 1 (tokens) = Task 1. Section 2 (components) = Tasks 3–8, individually + Task 9 audit. Section 3 (logo + favicon) = Task 2. Section 4 (testing) = gates inside every task + full walkthrough in Task 9 Step 4. Rollout plan's 9 commits = 9 tasks (1:1).
- **Placeholder scan:** no TBDs, no "similar to above" references, every code block is concrete with exact utility strings. Task 2's `sips --cropOffset` values are flagged as a visual judgment call (that's genuinely a judgment call, not a placeholder) with a "how to know if it's wrong + how to fix" instruction.
- **Type consistency:** no new types introduced; props shapes preserved on every component (`MatchCard`, `StandingsTable`, `ScoreInput`, `DraggableTeamPill`, `DroppableGroup`, `CompetitionToggle`). Token names (`bg-surface`, `text-ink`, `border-hair`, `border-card-hair`, `bg-card`, `bg-chrome`, `text-ink-soft`, `text-ink-muted`, `text-brand`, `bg-brand`, `bg-ink`, `bg-beige`, `border-beige`) are stable across all tasks and traceable back to the `@theme` block defined in Task 1.
