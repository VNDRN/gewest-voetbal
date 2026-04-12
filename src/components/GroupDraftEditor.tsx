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
