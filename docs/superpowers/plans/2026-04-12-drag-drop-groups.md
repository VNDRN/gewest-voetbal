# Drag & Drop Team Reordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to drag teams between groups on SetupPage after the initial draw, before scheduling.

**Architecture:** Split `handleGenerate()` into draw (local draft state) and confirm (dispatch to context + schedule). New `GroupDraftEditor` component wraps @dnd-kit's `DndContext` with `DraggableTeamPill` and `DroppableGroup` sub-components. Pure draft utility functions handle team movement and validation.

**Tech Stack:** React 19, @dnd-kit/core, TypeScript, Tailwind CSS, Vitest

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `package.json` | Modify | Add @dnd-kit/core dependency |
| `src/types.ts` | Modify | Add `DraftGroup` type |
| `src/engine/draft.ts` | Create | Pure functions: `createDraft`, `moveDraftTeam`, `validateDraft` |
| `src/__tests__/engine/draft.test.ts` | Create | Tests for draft logic |
| `src/components/DraggableTeamPill.tsx` | Create | Draggable team pill using useDraggable |
| `src/components/DroppableGroup.tsx` | Create | Droppable group card using useDroppable |
| `src/components/GroupDraftEditor.tsx` | Create | DndContext wrapper, DragOverlay, validation banner |
| `src/pages/SetupPage.tsx` | Modify | Split handleGenerate into draw + confirm, render GroupDraftEditor |

---

### Task 1: Install @dnd-kit/core

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the dependency**

Run: `npm install @dnd-kit/core`

- [ ] **Step 2: Verify installation**

Run: `npm ls @dnd-kit/core`
Expected: `@dnd-kit/core@<version>` appears in output

- [ ] **Step 3: Verify build still works**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(deps): add @dnd-kit/core for drag & drop"
```

---

### Task 2: Add DraftGroup type and draft utility functions

**Files:**
- Modify: `src/types.ts:45` (after Group type)
- Create: `src/engine/draft.ts`
- Create: `src/__tests__/engine/draft.test.ts`

- [ ] **Step 1: Add DraftGroup type**

In `src/types.ts`, add after the `Group` type (line 49):

```typescript
export type DraftGroup = {
  id: string;
  name: string;
  teamIds: string[];
};
```

- [ ] **Step 2: Write failing tests for createDraft**

Create `src/__tests__/engine/draft.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createDraft, moveDraftTeam, validateDraft } from "../../engine/draft";
import type { Competition } from "../../types";

function makeCompetition(teamCount: number, groupSize: number): Competition {
  const teams = Array.from({ length: teamCount }, (_, i) => ({
    id: `t${i}`,
    name: `Team ${i}`,
    groupId: "",
  }));
  return {
    id: "comp1",
    name: "Test",
    teams,
    groups: [],
    knockoutRounds: [],
    config: { groupSize, advancingPerGroup: 2, bestNextPlacedCount: 0, knockoutSize: 8 },
  };
}

describe("createDraft", () => {
  it("assigns all teams to groups", () => {
    const comp = makeCompetition(8, 4);
    const groups = createDraft(comp);
    const allTeamIds = groups.flatMap((g) => g.teamIds);
    expect(allTeamIds.sort()).toEqual(comp.teams.map((t) => t.id).sort());
  });

  it("creates correct number of groups based on config", () => {
    const comp = makeCompetition(8, 4);
    const groups = createDraft(comp);
    expect(groups).toHaveLength(2);
  });

  it("names groups alphabetically", () => {
    const comp = makeCompetition(12, 4);
    const groups = createDraft(comp);
    expect(groups.map((g) => g.name)).toEqual(["Groep A", "Groep B", "Groep C"]);
  });

  it("group IDs use competition ID prefix", () => {
    const comp = makeCompetition(8, 4);
    const groups = createDraft(comp);
    for (const g of groups) {
      expect(g.id).toMatch(/^comp1-group-/);
    }
  });

  it("shuffles teams (not always same order)", () => {
    const comp = makeCompetition(12, 4);
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const groups = createDraft(comp);
      results.add(groups.map((g) => g.teamIds.join(",")).join("|"));
    }
    expect(results.size).toBeGreaterThan(1);
  });
});

describe("moveDraftTeam", () => {
  it("moves a team from one group to another", () => {
    const groups = [
      { id: "g1", name: "Groep A", teamIds: ["a", "b", "c", "d"] },
      { id: "g2", name: "Groep B", teamIds: ["e", "f", "g", "h"] },
    ];
    const result = moveDraftTeam(groups, "a", "g2");
    expect(result.find((g) => g.id === "g1")!.teamIds).toEqual(["b", "c", "d"]);
    expect(result.find((g) => g.id === "g2")!.teamIds).toEqual(["e", "f", "g", "h", "a"]);
  });

  it("returns unchanged groups when team already in target group", () => {
    const groups = [
      { id: "g1", name: "Groep A", teamIds: ["a", "b", "c"] },
      { id: "g2", name: "Groep B", teamIds: ["d", "e", "f"] },
    ];
    const result = moveDraftTeam(groups, "a", "g1");
    expect(result).toEqual(groups);
  });

  it("returns unchanged groups when team not found", () => {
    const groups = [
      { id: "g1", name: "Groep A", teamIds: ["a", "b", "c"] },
      { id: "g2", name: "Groep B", teamIds: ["d", "e", "f"] },
    ];
    const result = moveDraftTeam(groups, "z", "g2");
    expect(result).toEqual(groups);
  });

  it("does not mutate original groups", () => {
    const groups = [
      { id: "g1", name: "Groep A", teamIds: ["a", "b", "c", "d"] },
      { id: "g2", name: "Groep B", teamIds: ["e", "f", "g"] },
    ];
    const original = JSON.stringify(groups);
    moveDraftTeam(groups, "a", "g2");
    expect(JSON.stringify(groups)).toBe(original);
  });
});

describe("validateDraft", () => {
  it("returns empty array when all groups have 3-5 teams", () => {
    const groups = [
      { id: "g1", name: "Groep A", teamIds: ["a", "b", "c"] },
      { id: "g2", name: "Groep B", teamIds: ["d", "e", "f", "g"] },
      { id: "g3", name: "Groep C", teamIds: ["h", "i", "j", "k", "l"] },
    ];
    expect(validateDraft(groups)).toEqual([]);
  });

  it("returns error when a group has fewer than 3 teams", () => {
    const groups = [
      { id: "g1", name: "Groep A", teamIds: ["a", "b"] },
      { id: "g2", name: "Groep B", teamIds: ["c", "d", "e", "f", "g"] },
    ];
    const errors = validateDraft(groups);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("Groep A");
  });

  it("returns error when a group has more than 5 teams", () => {
    const groups = [
      { id: "g1", name: "Groep A", teamIds: ["a", "b", "c"] },
      { id: "g2", name: "Groep B", teamIds: ["d", "e", "f", "g", "h", "i"] },
    ];
    const errors = validateDraft(groups);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("Groep B");
  });

  it("returns multiple errors for multiple invalid groups", () => {
    const groups = [
      { id: "g1", name: "Groep A", teamIds: ["a"] },
      { id: "g2", name: "Groep B", teamIds: ["b", "c", "d", "e", "f", "g", "h"] },
    ];
    const errors = validateDraft(groups);
    expect(errors).toHaveLength(2);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/engine/draft.test.ts`
Expected: FAIL — module `../../engine/draft` not found

- [ ] **Step 4: Implement draft utility functions**

Create `src/engine/draft.ts`:

```typescript
import type { Competition, DraftGroup } from "../types";
import { getGroupOptions } from "./groups";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createDraft(competition: Competition): DraftGroup[] {
  const opts = getGroupOptions(competition.teams.length);
  if (opts.length === 0) return [];

  const opt =
    opts.find((o) => o.sizes[0] === competition.config.groupSize) ?? opts[0];
  const shuffled = shuffle(competition.teams);
  const groups: DraftGroup[] = [];
  let teamIdx = 0;

  for (let g = 0; g < opt.groupCount; g++) {
    const groupSize = opt.sizes[g];
    const groupTeams = shuffled.slice(teamIdx, teamIdx + groupSize);
    teamIdx += groupSize;

    groups.push({
      id: `${competition.id}-group-${String.fromCharCode(65 + g)}`,
      name: `Groep ${String.fromCharCode(65 + g)}`,
      teamIds: groupTeams.map((t) => t.id),
    });
  }

  return groups;
}

export function moveDraftTeam(
  groups: DraftGroup[],
  teamId: string,
  targetGroupId: string
): DraftGroup[] {
  const sourceGroup = groups.find((g) => g.teamIds.includes(teamId));
  if (!sourceGroup || sourceGroup.id === targetGroupId) return groups;
  if (!groups.some((g) => g.id === targetGroupId)) return groups;

  return groups.map((g) => {
    if (g.id === sourceGroup.id) {
      return { ...g, teamIds: g.teamIds.filter((id) => id !== teamId) };
    }
    if (g.id === targetGroupId) {
      return { ...g, teamIds: [...g.teamIds, teamId] };
    }
    return g;
  });
}

export function validateDraft(groups: DraftGroup[]): string[] {
  const errors: string[] = [];
  for (const g of groups) {
    if (g.teamIds.length < 3) {
      errors.push(`${g.name} heeft slechts ${g.teamIds.length} teams (min. 3)`);
    } else if (g.teamIds.length > 5) {
      errors.push(`${g.name} heeft ${g.teamIds.length} teams (max. 5)`);
    }
  }
  return errors;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/engine/draft.test.ts`
Expected: All tests PASS

- [ ] **Step 6: Run typecheck**

Run: `npx tsc -b`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/engine/draft.ts src/__tests__/engine/draft.test.ts
git commit -m "feat(draft): add DraftGroup type and draft utility functions"
```

---

### Task 3: Create DraggableTeamPill component

**Files:**
- Create: `src/components/DraggableTeamPill.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/DraggableTeamPill.tsx`:

```typescript
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
      <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm shadow-lg border-2 border-indigo-400 -rotate-2">
        {name}
      </span>
    );
  }

  return (
    <span
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      {name}
    </span>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc -b`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/DraggableTeamPill.tsx
git commit -m "feat(dnd): add DraggableTeamPill component"
```

---

### Task 4: Create DroppableGroup component

**Files:**
- Create: `src/components/DroppableGroup.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/DroppableGroup.tsx`:

```typescript
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
      className={`rounded-xl border-2 p-4 transition-colors ${
        isOver
          ? "border-green-500 bg-green-50 ring-2 ring-green-200"
          : hasDraggingTeam
            ? "border-dashed border-red-300 bg-white"
            : "border-gray-200 bg-white"
      }`}
    >
      <h4 className="mb-2 text-sm font-semibold">
        {name}{" "}
        <span className="font-normal text-gray-400">({teamIds.length} teams)</span>
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

- [ ] **Step 2: Run typecheck**

Run: `npx tsc -b`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/DroppableGroup.tsx
git commit -m "feat(dnd): add DroppableGroup component"
```

---

### Task 5: Create GroupDraftEditor component

**Files:**
- Create: `src/components/GroupDraftEditor.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/GroupDraftEditor.tsx`:

```typescript
import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { Competition, DraftGroup } from "../types";
import DroppableGroup from "./DroppableGroup";
import DraggableTeamPill from "./DraggableTeamPill";
import { moveDraftTeam, validateDraft } from "../engine/draft";

export default function GroupDraftEditor({
  competitions,
  draftGroups,
  onDraftChange,
  onConfirm,
  onRedraw,
}: {
  competitions: Competition[];
  draftGroups: Map<string, DraftGroup[]>;
  onDraftChange: (compId: string, groups: DraftGroup[]) => void;
  onConfirm: () => void;
  onRedraw: () => void;
}) {
  const [activeTeam, setActiveTeam] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const allTeamNames = new Map<string, string>();
  for (const comp of competitions) {
    for (const t of comp.teams) {
      allTeamNames.set(t.id, t.name);
    }
  }

  const allErrors: string[] = [];
  for (const [, groups] of draftGroups) {
    allErrors.push(...validateDraft(groups));
  }
  const isValid = allErrors.length === 0;

  function findCompetitionForTeam(teamId: string): string | null {
    for (const [compId, groups] of draftGroups) {
      if (groups.some((g) => g.teamIds.includes(teamId))) return compId;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string;
    setActiveTeam({ id, name: allTeamNames.get(id) ?? id });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTeam(null);
    const { active, over } = event;
    if (!over) return;

    const teamId = active.id as string;
    const targetGroupId = over.id as string;
    const compId = findCompetitionForTeam(teamId);
    if (!compId) return;

    const groups = draftGroups.get(compId);
    if (!groups) return;

    const updated = moveDraftTeam(groups, teamId, targetGroupId);
    if (updated !== groups) {
      onDraftChange(compId, updated);
    }
  }

  return (
    <div className="space-y-6">
      {allErrors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {allErrors.map((err, i) => (
            <p key={i}>⚠️ {err}</p>
          ))}
        </div>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {competitions.map((comp) => {
          const groups = draftGroups.get(comp.id) ?? [];
          if (groups.length === 0) return null;

          const draggingFromGroupId = activeTeam
            ? groups.find((g) => g.teamIds.includes(activeTeam.id))?.id ?? null
            : null;

          return (
            <div key={comp.id}>
              <h3 className="mb-3 text-base font-semibold">{comp.name}</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {groups.map((group) => (
                  <DroppableGroup
                    key={group.id}
                    id={group.id}
                    name={group.name}
                    teamIds={group.teamIds}
                    teamNames={allTeamNames}
                    hasDraggingTeam={draggingFromGroupId === group.id}
                  />
                ))}
              </div>
            </div>
          );
        })}

        <DragOverlay>
          {activeTeam && (
            <DraggableTeamPill
              id={activeTeam.id}
              name={activeTeam.name}
              isDragOverlay
            />
          )}
        </DragOverlay>
      </DndContext>

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
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc -b`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/GroupDraftEditor.tsx
git commit -m "feat(dnd): add GroupDraftEditor component with DndContext"
```

---

### Task 6: Refactor SetupPage — split draw and confirm

**Files:**
- Modify: `src/pages/SetupPage.tsx`

This is the biggest change. We split `handleGenerate()` into `handleDraw()` (creates draft state) and `handleConfirm()` (generates schedule from draft). The existing `CompetitionSetup` component stays unchanged.

- [ ] **Step 1: Add imports and draft state**

At the top of `src/pages/SetupPage.tsx`, add the new imports. After the existing imports (line 16), add:

```typescript
import type { DraftGroup } from "../types";
import { createDraft } from "../engine/draft";
import GroupDraftEditor from "../components/GroupDraftEditor";
```

Inside `SetupPage()` (after `const navigate = useNavigate();` on line 200), add draft state:

```typescript
const [draftGroups, setDraftGroups] = useState<Map<string, DraftGroup[]> | null>(null);
```

- [ ] **Step 2: Create handleDraw function**

Add `handleDraw` function inside `SetupPage()`, after the `estimatedSlots` useMemo:

```typescript
function handleDraw() {
  const draft = new Map<string, DraftGroup[]>();
  for (const comp of tournament.competitions) {
    const groups = createDraft(comp);
    if (groups.length > 0) {
      draft.set(comp.id, groups);
    }
  }
  if (draft.size > 0) setDraftGroups(draft);
}
```

- [ ] **Step 3: Refactor handleGenerate into handleConfirm**

Replace the existing `handleGenerate` function with `handleConfirm` that reads from `draftGroups` instead of shuffling:

```typescript
function handleConfirm() {
  if (!draftGroups) return;

  dispatch({ type: "UPDATE_CONFIG", config: { breaks: [] } });
  const allMatches: { match: Match; compId: string; groupId: string }[] = [];
  const groupsPerComp: Map<string, Group[]> = new Map();

  for (const [compId, draft] of draftGroups) {
    const teamGroups: Record<string, string> = {};
    for (const g of draft) {
      for (const teamId of g.teamIds) {
        teamGroups[teamId] = g.id;
      }
    }

    dispatch({ type: "SET_TEAM_GROUPS", competitionId: compId, teamGroups });

    const groups: Group[] = draft.map((g) => {
      const matches = generateRoundRobinMatches(g.teamIds, g.id);
      for (const m of matches) {
        allMatches.push({ match: m, compId, groupId: g.id });
      }
      return { ...g, matches: [] };
    });

    groupsPerComp.set(compId, groups);
  }

  const scheduled = scheduleMatches(
    allMatches.map((m) => m.match),
    tournament.config.fieldCount
  );

  const scheduledMap = new Map<string, Match>();
  for (const m of scheduled) scheduledMap.set(m.id, m);

  const knockoutRoundsPerComp = new Map<string, KnockoutRound[]>();

  for (const [compId, groups] of groupsPerComp) {
    const finalGroups = groups.map((g) => {
      const groupMatches = allMatches
        .filter((m) => m.compId === compId && m.groupId === g.id)
        .map((m) => scheduledMap.get(m.match.id)!)
        .filter(Boolean);
      return { ...g, matches: groupMatches };
    });

    dispatch({ type: "SET_GROUPS", competitionId: compId, groups: finalGroups });

    const comp = tournament.competitions.find((c) => c.id === compId)!;
    const opt = getGroupOptions(comp.teams.length).find(
      (o) => o.sizes[0] === comp.config.groupSize
    );
    if (opt) {
      const bf = calculateBracketFill(opt.groupCount, comp.config.advancingPerGroup);
      dispatch({
        type: "UPDATE_COMPETITION_CONFIG",
        competitionId: compId,
        config: {
          knockoutSize: bf.knockoutSize,
          bestNextPlacedCount: bf.bestNextPlacedCount,
        },
      });
      knockoutRoundsPerComp.set(compId, generateKnockoutRounds(bf.knockoutSize));
    }
  }

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
  const maxRoundCount = Math.max(
    ...Array.from(knockoutRoundsPerComp.values()).map((r) => r.length),
    0
  );

  for (let offset = maxRoundCount - 1; offset >= 0; offset--) {
    let fieldIdx = 0;
    for (const [, rounds] of knockoutRoundsPerComp) {
      const roundIdx = rounds.length - 1 - offset;
      if (roundIdx < 0) continue;
      for (const match of rounds[roundIdx].matches) {
        match.fieldIndex = fieldIdx;
        match.timeSlot = nextSlot;
        fieldIdx++;
        if (fieldIdx >= tournament.config.fieldCount) {
          fieldIdx = 0;
          nextSlot++;
        }
      }
    }
    if (fieldIdx > 0) nextSlot++;
  }

  for (const [compId, rounds] of knockoutRoundsPerComp) {
    dispatch({
      type: "SET_KNOCKOUT_ROUNDS",
      competitionId: compId,
      knockoutRounds: rounds,
    });
  }

  navigate("/groups");
}
```

- [ ] **Step 4: Update the JSX return**

Replace the bottom button in the SetupPage return JSX. Change the existing "Schema genereren & groepen loten" button section to conditionally render either the draw button or the `GroupDraftEditor`:

Replace:
```tsx
<button
  onClick={handleGenerate}
  disabled={!canGenerate}
  className="w-full rounded-xl bg-green-600 py-3 text-lg font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
>
  Schema genereren & groepen loten
</button>
```

With:
```tsx
{draftGroups ? (
  <GroupDraftEditor
    competitions={tournament.competitions.filter((c) =>
      draftGroups.has(c.id)
    )}
    draftGroups={draftGroups}
    onDraftChange={(compId, groups) => {
      setDraftGroups((prev) => {
        const next = new Map(prev);
        next.set(compId, groups);
        return next;
      });
    }}
    onConfirm={handleConfirm}
    onRedraw={handleDraw}
  />
) : (
  <button
    onClick={handleDraw}
    disabled={!canGenerate}
    className="w-full rounded-xl bg-green-600 py-3 text-lg font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
  >
    Groepen loten
  </button>
)}
```

- [ ] **Step 5: Remove the old handleGenerate function and unused shuffle**

Delete the `shuffle` helper function at the top of the file (lines 18-25) — it's now in `src/engine/draft.ts`. Delete the old `handleGenerate` function entirely.

- [ ] **Step 6: Run typecheck and lint**

Run: `npx tsc -b && npm run lint`
Expected: No errors

- [ ] **Step 7: Run all tests**

Run: `npm run test:run`
Expected: All tests pass

- [ ] **Step 8: Commit**

```bash
git add src/pages/SetupPage.tsx
git commit -m "feat(dnd): split draw/confirm flow, wire up GroupDraftEditor"
```

---

### Task 7: Manual browser testing

**Files:** None (testing only)

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Test the draw flow**

1. Go to SetupPage, add 8+ teams to a competition
2. Configure group settings
3. Click "Groepen loten"
4. Verify groups appear with team pills in a 2-column grid
5. Verify "Herloten" and "Schema genereren" buttons appear

- [ ] **Step 3: Test drag & drop**

1. Drag a team pill from Group A to Group B
2. Verify the team moves to Group B
3. Verify team counts update
4. Drag a team back to confirm swap workflow (two manual moves)

- [ ] **Step 4: Test validation**

1. Move teams until one group has 2 teams
2. Verify red warning banner appears
3. Verify "Schema genereren" button is disabled
4. Move a team back to fix the group
5. Verify warning disappears and button re-enables

- [ ] **Step 5: Test re-draw**

1. Click "Herloten"
2. Verify groups reshuffle with new random assignments

- [ ] **Step 6: Test confirm flow**

1. With valid groups, click "Schema genereren"
2. Verify navigation to /groups
3. Verify groups page shows correct teams in correct groups
4. Verify matches are generated and scheduled
5. Go to /schedule and verify schedule is populated

- [ ] **Step 7: Commit any fixes if needed**

```bash
git add -A
git commit -m "fix(dnd): adjustments from manual testing"
```
