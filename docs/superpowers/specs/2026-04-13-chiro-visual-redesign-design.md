# Chiro visual redesign — design spec

**Issue:** VNDRN/gewest-voetbal#1
**Date:** 2026-04-13
**Scope:** Redesign the tournament app's visual system using the Chiro brand (palette + typography + component polish), add the SMR logo to the header, and replace the favicon. Not a layout / feature rewrite — pages and flows stay the same.

## Goal

Replace the current generic Tailwind gray/blue palette with a Chiro-branded design system that:

1. Uses the official Chiro palette (PMS 186 red, PMS 282 navy, PMS 467 beige)
2. Adopts Chiro's display-typography voice (condensed uppercase titles + clean body sans)
3. Gives match scores the visual weight they deserve (currently smaller than team names)
4. Adds proper weight to team chips on the setup screen
5. Ships the SMR (Gewest Sante Me Ratje) logo in the header and a matching favicon

Direction locked in during brainstorming: **"Light Editorial"** — cream canvas, white header/chrome, red used as a sharp accent rather than a fill. Feels like a broadsheet sport section: calm, mature, confident.

## Decisions made during brainstorming

| Decision | Choice |
|---|---|
| Palette character | Chiro huisstijl: red accent + navy ink + cream surface (per PDF p.18) |
| Token strategy | Tailwind v4 `@theme` block in `src/index.css` — semantic tokens, no hardcoded colors in components |
| Typography | Source Sans 3 (body/UI/scores) + Barlow Condensed (display/eyebrows). Web-native open-source substitutes for Chiro's Myriad Pro. Loaded from Google Fonts. |
| Advancing indicator | Navy @ 5% row tint + muted ▲ glyph + bold team name. Red never used for "qualifying" (semantic mismatch). |
| Reset button | Ghost-destructive in header (red text, faint red border, red tint on hover) → solid destructive fill only inside the confirm modal |
| Rollout | One PR, atomic commits (foundation → logo → per-component sweeps) |
| Logo | `public/SMR.png` dropped in header on a `#0a0a0a` tile (black bg of the PNG disappears into the tile). No re-export needed. |
| Favicon | Crop rat head from SMR.png → generate 32/192/180 PNGs via `sips`, drop old `favicon.svg` |
| `<title>` | Unchanged — stays `voetbaltoernooi` |
| Dark mode | Out of scope (issue explicitly excludes) |
| Visual regression tests | Out of scope |

## Section 1 · Design token architecture

All tokens live in `src/index.css` under Tailwind v4's `@theme` block so utilities like `bg-surface`, `text-ink`, `border-hair` are generated automatically.

```css
@theme {
  /* Chiro brand (from huisstijlgids p.18) */
  --color-brand: #E1143C;        /* PMS 186 — red accent, destructive */
  --color-ink: #00124D;          /* PMS 282 — primary text, headings, primary btn */
  --color-beige: #E4D096;        /* PMS 467 — reserved for hero/accent zones */

  /* Surfaces */
  --color-surface: #FAF7EE;      /* app canvas — whisper of cream */
  --color-card: #FFFFFF;         /* card / table fills */
  --color-chrome: #FFFFFF;       /* header + nav band */

  /* Ink gradient */
  --color-ink-soft: #475785;     /* secondary text */
  --color-ink-muted: #8A94B3;    /* tertiary text, disabled */

  /* Borders */
  --color-hair: #E6E1D2;         /* chrome dividers */
  --color-card-hair: #ECE6D7;    /* card internal dividers */

  /* Semantic aliases */
  --color-destructive: var(--color-brand);
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
```

### Typography utility classes

Defined in `src/index.css` outside the `@theme` block:

- `.display` — `font-family: var(--font-display); font-weight: 900; text-transform: uppercase; letter-spacing: .01em; line-height: 1;`
  → page titles ("GEWEST SMR", "GROEP A"), round headers
- `.eyebrow` — `font-family: var(--font-display); font-weight: 800; font-size: .75rem; letter-spacing: .16em; text-transform: uppercase; color: var(--color-brand);`
  → section labels ("VOETBALTOERNOOI · 2026", "STAND", "PLOEGEN")
- `.eyebrow-muted` — same as `.eyebrow` but `color: var(--color-ink-muted);`
  → metadata labels ("MATCH 3 / 6")

### Font loading

Single `<link>` added to `index.html` `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700;900&family=Barlow+Condensed:wght@700;800;900&display=swap" rel="stylesheet">
```

Only the weights we actually use are requested.

### Spacing & radii

No custom scale. Use Tailwind defaults throughout.
- Cards: `rounded-2xl` (16px)
- Buttons + chips: `rounded-lg` (8px) to `rounded-xl` (12px)
- Logo tile: `rounded-lg` (8–10px)

## Section 2 · Component pass

14 source files need changes. Listed by concern:

### Chrome — `src/components/Layout.tsx`

- Root: `bg-surface` canvas
- Header: `bg-chrome border-b border-hair` (white band)
- Logo block: 44×44 `rounded-lg bg-[#0a0a0a]` tile containing `<img src="/SMR.png" alt="Gewest Sante Me Ratje">` sized to fit
- Wordmark: `.display text-2xl text-ink` — `{tournament.name}` (user-editable; defaults to `"Toernooi"`)
- No hardcoded subtitle eyebrow under the wordmark — keep the header clean and let `tournament.name` carry the identity. (The mockups showed "VOETBALTOERNOOI · 2026" as an eyebrow; dropped to avoid duplicating / contradicting whatever the user has set as the name.)
- Header action buttons use the new button system (see below)
- Nav: `bg-chrome border-b border-hair`, tabs are `px-4 py-3.5 font-display font-bold uppercase tracking-wider text-sm`, inactive `text-ink-soft`, active `text-ink border-b-[3px] border-brand`
- Main: `mx-auto max-w-7xl px-4 py-6` stays

### Button system (applied across the app)

- **Primary** — `bg-ink text-white hover:bg-ink/90 rounded-lg px-4 py-2 text-sm font-semibold`
  Submit actions (save score, create group, etc.)
- **Secondary** — `bg-card text-ink border border-hair hover:bg-surface rounded-lg px-4 py-2 text-sm font-semibold`
  Export / Import / Cancel
- **Ghost destructive** — `bg-transparent text-brand border border-brand/25 hover:bg-brand/5 hover:border-brand rounded-lg px-4 py-2 text-sm font-semibold`
  Reset toernooi trigger in header
- **Destructive confirm** — `bg-brand text-white hover:bg-brand/90 rounded-lg px-4 py-2 text-sm font-semibold`
  The actual "Wis alles" button inside the reset confirmation modal

### Reset modal — `src/components/Layout.tsx`

- Backdrop: `bg-ink/40` (darker/warmer than current `black/50`)
- Panel: `bg-card rounded-2xl shadow-xl p-6`
- Close button: `text-ink-muted hover:text-ink`
- Title: `text-ink font-bold`
- Body: `text-ink-soft`
- Footer actions: secondary ("Exporteer eerst") + destructive confirm ("Wis alles")

### Match card — `src/components/MatchCard.tsx`

- Container: `bg-card border border-card-hair rounded-2xl px-6 py-5 hover:bg-surface transition-colors`
- Layout: `flex items-center justify-between gap-5`
- Team names: `text-sm font-semibold text-ink-soft` (home right-aligned, away left-aligned, each `flex-1`)
- **Score** (the main change): `text-4xl font-black tabular-nums text-ink leading-none`, dash rendered as `<span class="text-ink-muted mx-2 font-medium">–</span>`
  - Reads as `3 – 1` with proper sport-app weight
  - Penalty format: `3 – 3 (5 – 4 pen)` — "pen" and parens in smaller muted weight
- Pending match (no score yet): render `—` in `text-ink-muted` (replaces "vs")

### Standings table — `src/components/StandingsTable.tsx`

- Wrapper: `bg-card border border-card-hair rounded-2xl`
- `<thead>`: each `<th>` is `.eyebrow-muted text-[11px] py-3 px-2`
- `<tbody>` rows: `border-t border-card-hair`, position + points columns `font-bold tabular-nums`
- Advancing rows (index < `advancingCount`):
  - `bg-[var(--color-advancing-tint)]`
  - Team name cell: `font-bold` + appended `<span class="ml-1.5 text-[10px] text-ink-muted align-[1px]">▲</span>`
- Best-next-placed row (index === `advancingCount` when `bestNextPlacedCount > 0`):
  - Same `bg-[var(--color-advancing-tint)]` row treatment, no ▲ glyph
  - Rationale: they're also qualifying, just via a different route
- Non-qualifying rows: plain

### Score input modal — `src/components/ScoreInput.tsx`

- Inputs: `h-16 w-20 border-2 border-card-hair rounded-lg text-center text-3xl font-bold focus:border-ink focus:outline-none`
  (was `border-gray-300` + `focus:border-blue-500`)
- Dash between scores: `text-ink-muted` (was `text-gray-400`)
- Team labels: `text-sm font-semibold text-ink-soft`
- Penalty shootout zone (when score is level in a knockout match):
  - Divider: `border-t-2 border-dashed border-beige/70`
  - Label: `.eyebrow-muted text-ink-soft`
  - Inputs: `h-12 w-16 border-2 border-beige bg-beige/20 focus:border-ink`
  - "Beslissing vereist" warning: `text-ink-soft` (amber → brand-neutral; penalty is a state, not a warning)
- Footer: Cancel (secondary), Save (primary). Save disabled state uses `bg-ink/30` instead of light blue.

### Setup flow

- **`src/components/DraggableTeamPill.tsx`** — chunky team chips:
  - Idle: `inline-flex items-center gap-2 rounded-xl bg-card border border-card-hair px-4 py-2.5 text-sm font-bold text-ink cursor-grab`
  - Drag overlay: same + `shadow-lg border-brand -rotate-2`
  - Dragging (source): `opacity-30`
  - Optional leading dot `<span class="w-2 h-2 rounded-full bg-[team-color]"></span>` — only rendered if the team has an assigned color (not required for v1; add only if team colors already exist in state)
- **`src/components/DroppableGroup.tsx`** — drop zone:
  - Idle: `bg-card border-2 border-dashed border-hair rounded-2xl p-4`
  - Hover (droppable active): `border-ink bg-surface`
  - Empty state text: `text-ink-muted`
- **`src/components/GroupDraftEditor.tsx`** — group panel:
  - Group card: `bg-card border border-card-hair rounded-2xl p-5`
  - Group header: `.display text-lg text-ink`
  - Controls: secondary buttons

### Competition toggle — `src/components/CompetitionToggle.tsx`

- Container: `inline-flex bg-surface rounded-xl p-1`
- Active chip: `bg-card text-ink shadow-sm`
- Inactive chip: `text-ink-soft hover:text-ink`

### Schedule grid — `src/components/ScheduleGrid.tsx`

- Time slot labels: `.eyebrow-muted`
- Field/pitch headers: `.display text-sm text-ink`
- Empty slots: `bg-card border border-dashed border-card-hair rounded-xl`
- Slot cards: same as match-card styling

### Bracket view — `src/components/BracketView.tsx`

- Round headers: `.eyebrow` (brand red)
- Connector lines: `border-ink-muted` (not gray)
- Match nodes: same match-card styling, smaller padding
- Final / winner node: slightly heavier border (`border-ink` instead of `border-card-hair`)

### Pages

All four pages (`SetupPage.tsx`, `GroupsPage.tsx`, `SchedulePage.tsx`, `KnockoutPage.tsx`):

- Page `<h1>`: `.display text-2xl text-ink` (or `text-3xl` where breathing room allows)
- Section `<h2>`: `.eyebrow` (brand red)
- Helper/description text: `text-sm text-ink-soft`
- Inline form labels: `.eyebrow-muted`
- Remove hardcoded gray/blue utilities; swap for semantic tokens

## Section 3 · Logo & favicon

### In-app logo

`public/SMR.png` stays where it is (600×350, teal line-art on black). Rendered in the header as:

```html
<div class="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0a0a0a]">
  <img src="/SMR.png" alt="Gewest Sante Me Ratje" class="h-10 w-auto object-contain" />
</div>
```

The black background of the PNG disappears visually against the `#0a0a0a` tile. The tile doubles as a logo frame + gives the rat breathing room on the white header.

### Favicon generation

Replace `public/favicon.svg` (currently a generic purple shape unrelated to the project) with PNGs cropped from SMR.png focused on the rat head (SMR calligraphy is too fine at favicon size).

Generated via macOS `sips` (no extra tooling required):

```bash
# 1) Crop the rat head from the source (SMR.png is 600×350; the rat sits roughly in the right third)
# Approximate crop box: x=340 y=30 w=240 h=240 (verify with preview before committing)
sips --cropToHeightWidth 240 240 --cropOffset 30 340 public/SMR.png --out /tmp/smr-rathead.png

# 2) Produce the favicon sizes
sips -z 32 32 /tmp/smr-rathead.png --out public/favicon-32.png
sips -z 192 192 /tmp/smr-rathead.png --out public/favicon-192.png
sips -z 180 180 /tmp/smr-rathead.png --out public/apple-touch-icon.png
```

**Note:** exact crop offsets are a visual judgment call — verify the rat head centers cleanly in the 32×32 output before committing. Adjust `--cropOffset` if needed.

### HTML updates

In `index.html`, replace:

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

with:

```html
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

Delete `public/favicon.svg` (no longer referenced).

`<title>` stays `voetbaltoernooi`.

## Section 4 · Testing & verification

### Build + lint gate (mandatory per commit)

- `npm run lint` → zero new warnings
- `npm run build` → tsc + vite build pass (catches any bad utility class, unreferenced token, or TS regression)

### Existing test suite

- `npm run test:run` → all existing tests still pass (non-visual; engine/persistence)

### Manual visual verification (before marking the whole thing done)

Run `npm run dev` and walk every page end-to-end:

- **`/setup`** — team chips have proper weight, group drop zones look right on idle/hover, adding/removing teams works
- **`/groups`** — standings table with navy-tinted qualifying rows + ▲ glyph, competition toggle, clickable match cards
- **`/schedule`** — schedule grid readable, time labels render as eyebrows, match card hover wash shows
- **`/knockouts`** — bracket view with branded round headers, match cards, competition toggle
- **Header actions** — Export JSON/CSV download, Import file picker opens, Reset flow: ghost trigger → modal → destructive confirm wipes state, "Exporteer eerst" downloads then closes
- **Score input modal** — opens from any match, numeric inputs take focus with navy ring, penalty shootout inputs visible on drawn knockout matches
- **Favicon** — verify in Chrome + Safari tabs after build; confirm readable at tab size
- **SMR logo** — renders in header, black PNG bg invisible against logo tile

### Responsive check

Header + nav on iPhone-width viewport (≥375px). If button row overflows, it should wrap gracefully (not break the layout). No custom mobile styling is planned beyond what flex + wrapping provide; note any real issues as follow-up work.

### What's explicitly out of scope

- Adding visual regression / snapshot tests (separate issue if wanted)
- Dark mode support (issue explicitly excludes)
- Cross-browser matrix beyond Chrome + Safari (desktop + mobile viewport)
- A fully transparent version of SMR.png (can be a follow-up polish)
- Changing any copy, page structure, or feature behavior

## Rollout plan

One branch, one PR, atomic commits. Suggested commit order:

1. `feat(design): add chiro design tokens and typography`
2. `feat(design): add SMR logo and replace favicon`
3. `feat(design): restyle layout header, nav, and reset modal`
4. `feat(design): restyle match card with emphasized score`
5. `feat(design): restyle standings table with navy advancing indicator`
6. `feat(design): restyle score input modal`
7. `feat(design): restyle setup flow team chips and group drop zones`
8. `feat(design): restyle competition toggle, schedule grid, bracket view`
9. `feat(design): apply chiro type system to page titles and section headings`

Each commit keeps the app in a buildable state.

## Open questions

None at spec time. Call out during implementation if a token or treatment doesn't fit a real case that wasn't covered here.
