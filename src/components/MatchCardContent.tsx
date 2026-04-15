import type { ScheduledMatch } from "../types";
import { scheduledMatchMeta } from "./ScheduleGrid";

export function MatchCardContent({
  match,
  teamNames,
  showScore = true,
}: {
  match: ScheduledMatch;
  teamNames: Map<string, string>;
  showScore?: boolean;
}) {
  const meta = scheduledMatchMeta(match);
  const pillClass =
    meta.pillVariant === "dames" ? "bg-brand/8 text-brand" : "bg-ink/15 text-ink";
  const homeName = match.homeTeamId
    ? (teamNames.get(match.homeTeamId) ?? "?")
    : (match.homeSourceDescription ?? "TBD");
  const awayName = match.awayTeamId
    ? (teamNames.get(match.awayTeamId) ?? "?")
    : (match.awaySourceDescription ?? "TBD");
  const homeIsTbd = !match.homeTeamId;
  const awayIsTbd = !match.awayTeamId;

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span
          className={`rounded px-1.5 py-0.5 font-display text-[11px] font-extrabold uppercase tracking-[0.14em] ${pillClass}`}
        >
          {meta.pillLabel}
        </span>
        <span className="text-[11px] font-medium text-ink-muted">
          {meta.rightEyebrow}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span
          className={`truncate text-right text-[16px] ${
            homeIsTbd
              ? "italic font-medium text-ink-muted"
              : "font-semibold text-ink"
          }`}
        >
          {homeName}
        </span>
        {showScore && match.score ? (
          <span className="font-display text-[20px] font-black leading-none text-ink tabular-nums whitespace-nowrap">
            <span>{match.score.home}</span>
            <span className="mx-[3px] font-medium text-ink-muted">–</span>
            <span>{match.score.away}</span>
          </span>
        ) : (
          <span className="font-display text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-muted">
            VS
          </span>
        )}
        <span
          className={`truncate text-left text-[16px] ${
            awayIsTbd
              ? "italic font-medium text-ink-muted"
              : "font-semibold text-ink"
          }`}
        >
          {awayName}
        </span>
      </div>
    </>
  );
}
