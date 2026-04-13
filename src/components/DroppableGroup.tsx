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
