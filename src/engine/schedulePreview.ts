import type { TargetClass } from "./scheduleMove";
import type { ScheduledMatch } from "../types";

export type PreviewKind =
  | { kind: "default" }
  | { kind: "source-dimmed" }
  | { kind: "source-partner-ghost"; match: ScheduledMatch }
  | { kind: "target-self-ghost"; match: ScheduledMatch; hideOccupant: boolean };

export function previewKindFor(
  cellId: string,
  activeMatch: ScheduledMatch | null,
  overId: string | null,
  targetMap: Map<string, TargetClass>,
  allMatches: ScheduledMatch[]
): PreviewKind {
  if (!activeMatch) return { kind: "default" };

  const sourceCellId = `cell-${activeMatch.timeSlot}-${activeMatch.fieldIndex}`;
  const isSourceCell = cellId === sourceCellId;

  if (isSourceCell && overId && overId.startsWith("cell-")) {
    if (targetMap.get(overId) === "valid-swap") {
      const parts = overId.split("-");
      if (parts.length === 3) {
        const slot = Number(parts[1]);
        const field = Number(parts[2]);
        if (Number.isFinite(slot) && Number.isFinite(field)) {
          const partner = allMatches.find(
            (m) =>
              m.timeSlot === slot &&
              m.fieldIndex === field &&
              !(m.id === activeMatch.id && m.competitionId === activeMatch.competitionId)
          );
          if (partner) {
            return { kind: "source-partner-ghost", match: partner };
          }
        }
      }
    }
  }

  if (isSourceCell) return { kind: "source-dimmed" };

  if (cellId === overId) {
    const cls = targetMap.get(cellId);
    if (cls === "valid-move") {
      return { kind: "target-self-ghost", match: activeMatch, hideOccupant: false };
    }
    if (cls === "valid-swap") {
      return { kind: "target-self-ghost", match: activeMatch, hideOccupant: true };
    }
  }

  return { kind: "default" };
}
