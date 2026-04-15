import type { ScheduledMatch } from "../types";
import { ActionChip, type ActionChipKind } from "./ActionChip";
import { MatchCardContent } from "./MatchCardContent";

export function GhostCard({
  match,
  teamNames,
  chipKind,
}: {
  match: ScheduledMatch;
  teamNames: Map<string, string>;
  chipKind?: ActionChipKind | null;
}) {
  return (
    <div
      className="relative flex w-full flex-col gap-4 rounded-lg border border-dashed border-ink/50 bg-card p-3"
      style={{ opacity: 0.55, transform: "scale(0.96)" }}
    >
      <MatchCardContent match={match} teamNames={teamNames} showScore={false} />
      {chipKind && <ActionChip kind={chipKind} />}
    </div>
  );
}
