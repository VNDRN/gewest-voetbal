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
            <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-500">
              Tijd
            </th>
            {Array.from({ length: fieldCount }, (_, i) => (
              <th
                key={i}
                className="border border-gray-200 bg-gray-50 px-3 py-2 text-center text-xs font-medium text-gray-500"
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
                  <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-600 whitespace-nowrap">
                    {formatTime(slot, startTime, slotDurationMinutes, breaks)}
                  </td>
                  {Array.from({ length: fieldCount }, (_, field) => {
                    const match = grid.get(`${slot}-${field}`);
                    if (!match) {
                      return (
                        <td
                          key={field}
                          className="border border-gray-200 px-3 py-2"
                        />
                      );
                    }
                    const isWomens = match.competitionId === "womens";
                    const badgeClass = isWomens
                      ? "bg-pink-100 text-pink-700"
                      : "bg-blue-100 text-blue-700";
                    const isKnockout = match.phase === "knockout";
                    const homeName = match.homeTeamId
                      ? (teamNames.get(match.homeTeamId) ?? "?")
                      : (match.homeSourceDescription ?? "TBD");
                    const awayName = match.awayTeamId
                      ? (teamNames.get(match.awayTeamId) ?? "?")
                      : (match.awaySourceDescription ?? "TBD");

                    const inner = (
                      <>
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${badgeClass}`}
                          >
                            {isWomens ? "W" : "M"}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {match.groupName}
                          </span>
                        </div>
                        <div className="mt-1 text-xs">
                          <span className={isKnockout && !match.homeTeamId ? "italic text-gray-400" : "font-medium"}>
                            {homeName}
                          </span>
                          <span className="mx-1 text-gray-400">
                            {match.score
                              ? `${match.score.home}-${match.score.away}`
                              : "vs"}
                          </span>
                          <span className={isKnockout && !match.awayTeamId ? "italic text-gray-400" : "font-medium"}>
                            {awayName}
                          </span>
                        </div>
                      </>
                    );

                    return (
                      <td
                        key={field}
                        className="border border-gray-200 px-2 py-1.5"
                      >
                        {isKnockout ? (
                          <div className="rounded-lg border border-dashed border-gray-300 p-1.5">
                            {inner}
                          </div>
                        ) : (
                          <button
                            onClick={() => onMatchClick(match)}
                            className="w-full rounded-lg p-1.5 text-left transition-colors hover:bg-gray-50"
                          >
                            {inner}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
                {schedBreak && (
                  <tr>
                    <td
                      colSpan={fieldCount + 1}
                      className="border border-gray-200 p-0"
                    >
                      <div className="flex items-center justify-between border-y-2 border-dashed border-yellow-400 bg-yellow-50 px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">☕</span>
                          <span className="text-sm font-semibold text-yellow-800">
                            Pauze
                          </span>
                          <span className="text-xs text-yellow-700">
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
                            className="w-14 rounded-md border border-yellow-400 bg-white px-1.5 py-0.5 text-center text-xs"
                          />
                          <span className="text-xs text-yellow-700">min</span>
                          <button
                            onClick={() => onRemoveBreak(schedBreak.id)}
                            className="text-sm text-red-600 opacity-60 hover:opacity-100"
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
                      <div className="relative flex h-0 items-center justify-center overflow-visible">
                        <button
                          onClick={() => onAddBreak(slot)}
                          className="absolute z-10 flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-xs text-gray-500 opacity-0 shadow-sm transition-opacity hover:bg-gray-200 group-hover/add:opacity-100"
                        >
                          +
                        </button>
                      </div>
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
