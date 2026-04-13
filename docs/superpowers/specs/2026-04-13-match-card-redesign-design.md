# Match Card Redesign — Design

**Date:** 2026-04-13
**Status:** Approved, ready for implementation plan
**Issue:** [#23](https://github.com/VNDRN/football-tournament/issues/23)

## Summary

Redesign the match cell rendered inside `ScheduleGrid` so the schedule tab matches the rest of the Chiro-branded app: clearer hierarchy, display-font score, color-coded competition pill, consistent spacing, and a single `home — score — away` row.

## Motivation

The current match cells cram a single-letter `M`/`W` badge, group name, two team names, and a score into one tight line with inconsistent weights. They look like legacy plain-text spreadsheet content rather than part of the branded app (which uses Barlow Condensed display type, ink-navy headings, and generous card spacing elsewhere).

## Architecture

A single file changes: `src/components/ScheduleGrid.tsx`. The match-cell JSX is replaced. No new components, no prop changes, no data changes.

### Card layout

Column flex, 12px padding, `gap-4` (16px) between the two rows:

1. **Header row** — flex, space-between:
   - **Left pill:** `Barlow Condensed`, 800, 10px, uppercase, `tracking-[0.14em]`, 2px-by-6px padding, `rounded` (4px). Content = `{competitionLabel} · {groupOrRoundShort}` for group matches, just `{roundName}` for knockout.
     - Heren variant: `bg-ink/8 text-ink`
     - Dames variant: `bg-brand/8 text-brand`
   - **Right eyebrow:** 10px, `font-semibold text-ink-muted`. Content = `"Groep"` for group matches, `{competitionLabel}` for knockout matches.

2. **Teams row** — `grid grid-cols-[1fr_auto_1fr] items-center gap-2`:
   - **Home** (col 1, right-aligned): 13px, `font-semibold text-ink`, `truncate`.
   - **Score / VS** (col 2, auto):
     - Played: `Barlow Condensed` 900, 20px, `text-ink`. Separator `–` in `text-ink-muted`, `font-medium`, horizontal margin 3px.
     - Unplayed: `Barlow Condensed` 800, 11px, `text-ink-muted`, `tracking-[0.18em]`, literal `"VS"`.
   - **Away** (col 3, left-aligned): same as home.
   - **TBD placeholder:** `italic font-medium text-ink-muted` (no border-dashed on the team cell — the card border handles it).

### Card container

- **Button vs div:** keep the existing `canClick` split. Clickable matches render as `<button>`, unclickable (knockout without both teams) as `<div>`.
- **Base classes:** `w-full rounded-lg border border-card-hair bg-card p-3 text-left transition-colors hover:bg-surface`
- **Knockout without both teams:** replace `border-card-hair` with `border-dashed border-card-hair` so the dashed treatment now covers the whole card instead of only the inner content. The unclickable `<div>` variant drops `hover:bg-surface`.
- The surrounding `<td>` stays but its padding tightens to `p-1` so the new card's own padding provides the breathing room.

### Content mapping

Computed inside the existing cell render — no new props:

| Field | Group match | Knockout match |
|---|---|---|
| `competitionLabel` | `isWomens ? "Dames" : "Heren"` | same |
| `groupOrRoundShort` | last token of `match.groupName` (e.g. `"Groep A"` → `"A"`) | — |
| Pill text | `` `${competitionLabel} · ${groupOrRoundShort}` `` | `match.groupName` (e.g. `"Halve finale"`) |
| Right eyebrow | `"Groep"` | `competitionLabel` |

`groupOrRoundShort` extraction: `match.groupName.split(" ").pop() ?? match.groupName` — safe fallback if the group name has no space.

## Testing

No engine or data logic changes, so no new unit tests. Visual verification on the Schedule page:

- Render the schedule with at least one Heren group match, one Dames group match, and one knockout match (TBD + resolved).
- Confirm in the browser at /schedule: pill colors match competition, 16px gap between header and teams, dashed border on TBD knockouts, score renders in Barlow Condensed at 20px, long team names truncate with ellipsis instead of wrapping.
- Confirm no horizontal scrollbar appears at the default tournament size (4 fields, typical viewport).

## Non-goals

- No change to the score-edit modal, the time column, the break row, or the filter pills above the grid.
- No change to `MatchCard.tsx` (that's a different component used elsewhere — it already has display-font styling).
- No accessibility overhaul beyond preserving the existing `<button>` / `<div>` semantics.
- No help-content update needed — the schedule page flow is unchanged.
