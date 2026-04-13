# Help Button — Design

**Date:** 2026-04-13
**Status:** Approved, ready for implementation plan

## Summary

Add a `?` icon button to the right of the four navigation tabs (Instellingen, Groepen, Schema, Knock-out). Clicking it opens a modal with screen-specific help content explaining what the user can do on the current page, describing every option, and pointing to the next step.

## Motivation

Users encountering the tournament tool for the first time have no guidance on how each screen works or what the intended flow between screens is. An always-available, per-screen help modal gives a low-friction discoverability mechanism without cluttering the pages themselves.

## Architecture

Three touch points:

### 1. `src/components/HelpButton.tsx` (new)

Presentational component. Renders the `?` trigger button and the modal.

- **Props:** `{ title: string; intro: string; options: { label: string; description: string }[]; next: string }`
- **Trigger styling:** circular button, 36×36, `border border-hair`, `text-ink-soft hover:text-ink`, `cursor-pointer`, `aria-label="Hulp"`
- **Modal styling:** reuses the existing reset modal pattern — `fixed inset-0 z-50 flex items-center justify-center bg-ink/40` overlay, `rounded-2xl bg-card p-6 shadow-xl max-w-lg` panel, `✕` close button top-right
- **Modal structure:**
  - `<h3>` title
  - Intro paragraph
  - "Wat kan je doen" options list (definition-list style: `<dt>` label in bold, `<dd>` description)
  - "Volgende stap" footer section with the `next` string
- **Close behaviors:** Escape key, overlay click, `✕` click — matches the triple pattern already used by the reset modal in `Layout.tsx`

### 2. `src/content/helpContent.ts` (new)

Single source of truth for help copy.

```ts
export type HelpEntry = {
  title: string;
  intro: string;
  options: { label: string; description: string }[];
  next: string;
};

export const helpContent: Record<string, HelpEntry> = {
  "/setup": { ... },
  "/groups": { ... },
  "/schedule": { ... },
  "/knockouts": { ... },
};
```

Full Dutch content for each route is in the "Help content" section below.

### 3. `src/components/Layout.tsx` (edit)

- Import `HelpButton` and `helpContent`
- In the nav row, after the `NAV_ITEMS.map(...)`, add the `HelpButton`
- Position: right-aligned via `ml-auto` on the `HelpButton` trigger — pushes it to the far right of the tab row
- Use `useLocation().pathname` to look up the entry; if no match (e.g. unknown route during redirect), render nothing

## Behavior

- Click `?` → modal opens with content for the current route
- Escape / overlay click / `✕` → modal closes
- Switching routes while modal is open is not a concern (modal is local to the button's state; closing before navigating is the natural flow, but even if left open, content is resolved at render time from the current pathname)
- No focus trap, no auto-focus management (matches the simplicity of the existing reset modal — KISS)

## Help content (Dutch)

### `/setup` — Instellingen

- **Intro:** "Start hier. Stel je toernooi in, voeg teams toe en loot de groepen."
- **Options:**
  - **Naam, Datum** — toernooi-metadata die terugkomt op exports
  - **Velden** — aantal speelvelden tegelijk beschikbaar (bepaalt hoeveel matchen parallel lopen)
  - **Tijdslot (min)** — duur van één wedstrijd-slot inclusief wissel
  - **Starttijd** — eerste aftrap van de dag
  - **Teams (per competitie)** — typ een naam + Enter of "Toevoegen". Klik `×` om te verwijderen.
  - **Groepsindeling** — kies hoeveel groepen (min. 6 teams nodig)
  - **Doorgang per groep** — top N uit elke groep gaat door naar de knock-out
  - **Groepen loten** — genereert willekeurige groepen, schema én knock-out-bracket. Je kunt de loting herzien voor je bevestigt.
- **Next:** "Klaar? Ga naar **Groepen** om de stand per poule te zien en scores in te vullen."

### `/groups` — Groepen

- **Intro:** "Volg de stand per groep en vul wedstrijduitslagen in."
- **Options:**
  - **Heren / Dames schakelaar** — wissel tussen competities
  - **Groepstabel** — live stand (punten, doelsaldo). Gekleurde rijen = doorgang. Ster-symbool = beste-volgende-kandidaat.
  - **Wedstrijdkaart (klik)** — opent scorepopup om uitslag in te vullen of te wijzigen
  - **Beste volgende** — aparte tabel onderaan als niet alle doorgangplekken direct uit de groep komen
- **Next:** "Vul alle groepswedstrijden in en bekijk dan het volledige tijdschema op **Schema**."

### `/schedule` — Schema

- **Intro:** "Zie het complete dagschema per veld en tijdslot. Hier start je ook de knock-outfase."
- **Options:**
  - **Filter (Alles / Heren / Dames)** — beperk de weergave tot één competitie
  - **Schema-grid** — rijen = tijdsloten, kolommen = velden. Klik een wedstrijd om de score in te vullen.
  - **Pauze toevoegen / aanpassen** — voeg pauzes in tussen tijdsloten; alle latere tijden schuiven op
  - **Knock-outfase genereren** — verschijnt zodra alle groepswedstrijden gespeeld zijn. Zet de gekwalificeerde teams in de bracket.
- **Next:** "Na de groepsfase: genereer de knock-out en volg de bracket op **Knock-out**."

### `/knockouts` — Knock-out

- **Intro:** "Volg de bracket tot en met de finale."
- **Options:**
  - **Filter (Alles / Heren / Dames)** — toon één of beide brackets
  - **Bracket** — klik een wedstrijd om de score (en eventueel penalty's) in te vullen. Winnaars schuiven automatisch door.
  - **Kampioen-banner** — verschijnt zodra de finale beslist is
- **Next:** "Toernooi afgerond — exporteer de uitslag via de knop bovenaan."

## Maintenance rule

**When any page flow or feature changes, update the corresponding entry in `src/content/helpContent.ts` as part of the same change.** The help modal is the primary user-facing documentation; stale help is worse than no help.

## Out of scope

- First-visit auto-open of the modal
- Persistent "seen" state
- Keyboard shortcut for opening (e.g. `?` key)
- Screenshots / embedded images in help content
- Internationalization beyond Dutch
- Focus trap / focus restoration (matches reset modal behavior)

## Testing

Manual verification:
1. Each route shows its own help content when `?` is clicked
2. Modal closes via Escape, overlay click, and `✕` button
3. Button has visible pointer cursor on hover
4. Modal is readable on narrow viewports (iPad portrait is the primary target)
5. No layout shift in the nav row when the button is added
