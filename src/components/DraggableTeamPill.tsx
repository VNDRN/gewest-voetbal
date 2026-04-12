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
