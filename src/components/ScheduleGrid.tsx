import type { Match } from "../types";

type ScheduledMatch = Match & {
  competitionId: string;
  groupName: string;
};

type Props = {
  matches: ScheduledMatch[];
  fieldCount: number;
  startTime: string;
  slotDurationMinutes: number;
  teamNames: Map<string, string>;
  onMatchClick: (match: ScheduledMatch) => void;
};

function formatTime(
  slot: number,
  startTime: string,
  slotDuration: number
): string {
  const [h, m] = startTime.split(":").map(Number);
  const total = h * 60 + m + slot * slotDuration;
  const hours = Math.floor(total / 60).toString().padStart(2, "0");
  const mins = (total % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

export default function ScheduleGrid({
  matches,
  fieldCount,
  startTime,
  slotDurationMinutes,
  teamNames,
  onMatchClick,
}: Props) {
  const maxSlot = matches.reduce((max, m) => Math.max(max, m.timeSlot), 0);
  const slots = Array.from({ length: maxSlot + 1 }, (_, i) => i);

  const grid = new Map<string, ScheduledMatch>();
  for (const m of matches) {
    grid.set(`${m.timeSlot}-${m.fieldIndex}`, m);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-500">
              Time
            </th>
            {Array.from({ length: fieldCount }, (_, i) => (
              <th
                key={i}
                className="border border-gray-200 bg-gray-50 px-3 py-2 text-center text-xs font-medium text-gray-500"
              >
                Field {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => (
            <tr key={slot}>
              <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-600 whitespace-nowrap">
                {formatTime(slot, startTime, slotDurationMinutes)}
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
                return (
                  <td
                    key={field}
                    className="border border-gray-200 px-2 py-1.5"
                  >
                    <button
                      onClick={() => onMatchClick(match)}
                      className="w-full rounded-lg p-1.5 text-left transition-colors hover:bg-gray-50"
                    >
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
                        <span className="font-medium">
                          {teamNames.get(match.homeTeamId) ?? "?"}
                        </span>
                        <span className="mx-1 text-gray-400">
                          {match.score
                            ? `${match.score.home}-${match.score.away}`
                            : "vs"}
                        </span>
                        <span className="font-medium">
                          {teamNames.get(match.awayTeamId) ?? "?"}
                        </span>
                      </div>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type { ScheduledMatch };
