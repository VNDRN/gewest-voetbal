import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDndSensors } from "../hooks/useDndSensors";
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

  const sensors = useDndSensors();

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

  function handleDragCancel() {
    setActiveTeam(null);
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
        <div className="rounded-xl border border-brand/25 bg-brand/5 p-3 text-sm text-brand">
          {allErrors.map((err, i) => (
            <p key={i}>⚠️ {err}</p>
          ))}
        </div>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {competitions.map((comp) => {
          const groups = draftGroups.get(comp.id) ?? [];
          if (groups.length === 0) return null;

          const draggingFromGroupId = activeTeam
            ? groups.find((g) => g.teamIds.includes(activeTeam.id))?.id ?? null
            : null;

          return (
            <div key={comp.id}>
              <h3 className="display mb-3 text-xl text-ink">{comp.name}</h3>
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
    </div>
  );
}
