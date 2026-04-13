import { Fragment } from "react";
import { formatTime } from "../engine/time";
import type { ScheduleBreak } from "../types";

type ScheduledMatch = {
  id: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  fieldIndex: number;
  timeSlot: number;
  score: { home: number; away: number } | null;
  phase: "group" | "knockout";
  competitionId: string;
  groupName: string;
  homeSourceDescription?: string;
  awaySourceDescription?: string;
};

export type MatchPillVariant = "heren" | "dames";

export type MatchMeta = {
  pillLabel: string;
  rightEyebrow: string;
  pillVariant: MatchPillVariant;
};

// eslint-disable-next-line react-refresh/only-export-components
export function scheduledMatchMeta(match: ScheduledMatch): MatchMeta {
  const pillVariant: MatchPillVariant =
    match.competitionId === "womens" ? "dames" : "heren";
  const competitionLabel = pillVariant === "dames" ? "Dames" : "Heren";

  if (match.phase === "knockout") {
    return {
      pillLabel: match.groupName,
      rightEyebrow: competitionLabel,
      pillVariant,
    };
  }

  const groupShort = match.groupName.split(" ").pop() ?? match.groupName;
  return {
    pillLabel: `${competitionLabel} · ${groupShort}`,
    rightEyebrow: "Groep",
    pillVariant,
  };
}

type Props = {
  matches: ScheduledMatch[];
  fieldCount: number;
  startTime: string;
  slotDurationMinutes: number;
  breaks: ScheduleBreak[];
  teamNames: Map<string, string>;
  onMatchClick: (match: ScheduledMatch) => void;
  onAddBreak: (afterTimeSlot: number) => void;
  onUpdateBreak: (breakId: string, durationMinutes: number) => void;
  onRemoveBreak: (breakId: string) => void;
};

export default function ScheduleGrid({
  matches,
  fieldCount,
  startTime,
  slotDurationMinutes,
  breaks,
  teamNames,
  onMatchClick,
  onAddBreak,
  onUpdateBreak,
  onRemoveBreak,
}: Props) {
  const maxSlot = matches.reduce((max, m) => Math.max(max, m.timeSlot), 0);
  const slots = Array.from({ length: maxSlot + 1 }, (_, i) => i);

  const grid = new Map<string, ScheduledMatch>();
  for (const m of matches) {
    grid.set(`${m.timeSlot}-${m.fieldIndex}`, m);
  }

  const breakMap = new Map<number, ScheduleBreak>();
  for (const b of breaks) {
    breakMap.set(b.afterTimeSlot, b);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="eyebrow-muted border border-card-hair bg-surface px-3 py-2 text-left text-[11px]">
              Tijd
            </th>
            {Array.from({ length: fieldCount }, (_, i) => (
              <th
                key={i}
                className="eyebrow-muted border border-card-hair bg-surface px-3 py-2 text-center text-[11px]"
              >
                Veld {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot, slotIdx) => {
            const schedBreak = breakMap.get(slot);
            const breakStartTime = schedBreak
              ? formatTime(slot + 1, startTime, slotDurationMinutes,
                  breaks.filter((b) => b.id !== schedBreak.id))
              : null;
            const breakEndTime = schedBreak
              ? formatTime(slot + 1, startTime, slotDurationMinutes, breaks)
              : null;

            return (
              <Fragment key={slot}>
                <tr>
                  <td className="border border-card-hair bg-surface px-3 py-2 text-xs font-semibold text-ink-soft tabular-nums whitespace-nowrap">
                    {formatTime(slot, startTime, slotDurationMinutes, breaks)}
                  </td>
                  {Array.from({ length: fieldCount }, (_, field) => {
                    const match = grid.get(`${slot}-${field}`);
                    if (!match) {
                      return (
                        <td
                          key={field}
                          className="border border-card-hair px-3 py-2"
                        />
                      );
                    }
                    const meta = scheduledMatchMeta(match);
                    const isKnockout = match.phase === "knockout";
                    const homeName = match.homeTeamId
                      ? (teamNames.get(match.homeTeamId) ?? "?")
                      : (match.homeSourceDescription ?? "TBD");
                    const awayName = match.awayTeamId
                      ? (teamNames.get(match.awayTeamId) ?? "?")
                      : (match.awaySourceDescription ?? "TBD");
                    const homeIsTbd = !match.homeTeamId;
                    const awayIsTbd = !match.awayTeamId;
                    const isTbdKnockout =
                      isKnockout && (homeIsTbd || awayIsTbd);

                    const pillClass =
                      meta.pillVariant === "dames"
                        ? "bg-brand/10 text-brand"
                        : "bg-ink/10 text-ink";

                    const cardClass = `flex w-full flex-col gap-4 rounded-lg border bg-card p-3 text-left transition-colors ${
                      isTbdKnockout
                        ? "border-dashed border-card-hair"
                        : "border-card-hair"
                    }`;

                    const inner = (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 font-display text-[10px] font-extrabold uppercase tracking-[0.14em] ${pillClass}`}
                          >
                            {meta.pillLabel}
                          </span>
                          <span className="text-[10px] font-semibold text-ink-muted">
                            {meta.rightEyebrow}
                          </span>
                        </div>
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                          <span
                            className={`truncate text-right text-[13px] ${
                              homeIsTbd
                                ? "italic font-medium text-ink-muted"
                                : "font-semibold text-ink"
                            }`}
                          >
                            {homeName}
                          </span>
                          {match.score ? (
                            <span className="font-display text-[20px] font-black leading-none text-ink tabular-nums whitespace-nowrap">
                              <span>{match.score.home}</span>
                              <span className="mx-[3px] font-medium text-ink-muted">
                                –
                              </span>
                              <span>{match.score.away}</span>
                            </span>
                          ) : (
                            <span className="font-display text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-muted">
                              VS
                            </span>
                          )}
                          <span
                            className={`truncate text-left text-[13px] ${
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

                    const canClick =
                      !isKnockout || (match.homeTeamId && match.awayTeamId);

                    return (
                      <td
                        key={field}
                        className="border border-card-hair p-1"
                      >
                        {canClick ? (
                          <button
                            onClick={() => onMatchClick(match)}
                            className={`${cardClass} hover:bg-surface`}
                          >
                            {inner}
                          </button>
                        ) : (
                          <div className={cardClass}>{inner}</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
                {schedBreak && (
                  <tr>
                    <td
                      colSpan={fieldCount + 1}
                      className="border border-card-hair p-0"
                    >
                      <div className="flex items-center justify-between border-y-2 border-dashed border-beige bg-beige/20 px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">☕</span>
                          <span className="text-sm font-bold text-ink">
                            Pauze
                          </span>
                          <span className="text-xs text-ink-soft">
                            {breakStartTime} – {breakEndTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            value={schedBreak.durationMinutes}
                            onChange={(e) =>
                              onUpdateBreak(
                                schedBreak.id,
                                Math.max(1, Number(e.target.value))
                              )
                            }
                            className="w-14 rounded-md border border-beige bg-card px-1.5 py-0.5 text-center text-xs tabular-nums text-ink"
                          />
                          <span className="text-xs text-ink-soft">min</span>
                          <button
                            onClick={() => onRemoveBreak(schedBreak.id)}
                            className="text-sm text-brand opacity-60 hover:opacity-100"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                {slotIdx < slots.length - 1 && !schedBreak && (
                  <tr className="group/add">
                    <td
                      colSpan={fieldCount + 1}
                      className="border-0 p-0"
                    >
                      <button
                        onClick={() => onAddBreak(slot)}
                        className="flex h-6 w-full cursor-pointer items-center justify-center transition-colors hover:bg-surface"
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-card-hair bg-surface text-xs text-ink-muted opacity-0 shadow-sm transition-opacity group-hover/add:opacity-100">
                          +
                        </span>
                      </button>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export type { ScheduledMatch };
