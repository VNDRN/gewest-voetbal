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
