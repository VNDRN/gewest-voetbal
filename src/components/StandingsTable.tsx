import type { StandingRow } from "../types";

type Props = {
  rows: StandingRow[];
  advancingCount: number;
  bestNextPlacedCount: number;
  teamNames: Map<string, string>;
};

export default function StandingsTable({
  rows,
  advancingCount,
  bestNextPlacedCount,
  teamNames,
}: Props) {
  function isQualifying(index: number): boolean {
    if (index < advancingCount) return true;
    if (bestNextPlacedCount > 0 && index === advancingCount) return true;
    return false;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-card-hair bg-card">
      <table className="w-full text-sm text-ink">
        <thead>
          <tr className="eyebrow-muted text-left">
            <th className="px-3 py-3 text-[11px]">#</th>
            <th className="px-3 py-3 text-[11px]">Team</th>
            <th className="px-3 py-3 text-center text-[11px]">GS</th>
            <th className="px-3 py-3 text-center text-[11px]">W</th>
            <th className="px-3 py-3 text-center text-[11px]">G</th>
            <th className="px-3 py-3 text-center text-[11px]">V</th>
            <th className="px-3 py-3 text-center text-[11px]">DV</th>
            <th className="px-3 py-3 text-center text-[11px]">DT</th>
            <th className="px-3 py-3 text-center text-[11px]">DS</th>
            <th className="px-3 py-3 text-center text-[11px]">Ptn</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const qualifying = isQualifying(i);
            const isAdvancing = i < advancingCount;
            return (
              <tr
                key={row.teamId}
                className={`border-t border-card-hair ${qualifying ? "bg-[var(--color-advancing-tint)]" : ""}`}
              >
                <td className="px-3 py-3 font-bold tabular-nums">{i + 1}</td>
                <td className={`px-3 py-3 ${isAdvancing ? "font-bold" : ""}`}>
                  {teamNames.get(row.teamId) ?? row.teamId}
                  {isAdvancing && (
                    <span className="ml-1.5 align-[1px] text-[10px] text-ink-muted">
                      ▲
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-center tabular-nums">{row.played}</td>
                <td className="px-3 py-3 text-center tabular-nums">{row.won}</td>
                <td className="px-3 py-3 text-center tabular-nums">{row.drawn}</td>
                <td className="px-3 py-3 text-center tabular-nums">{row.lost}</td>
                <td className="px-3 py-3 text-center tabular-nums">{row.goalsFor}</td>
                <td className="px-3 py-3 text-center tabular-nums">{row.goalsAgainst}</td>
                <td className="px-3 py-3 text-center tabular-nums">{row.goalDifference}</td>
                <td className="px-3 py-3 text-center font-bold tabular-nums">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
