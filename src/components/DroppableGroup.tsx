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
