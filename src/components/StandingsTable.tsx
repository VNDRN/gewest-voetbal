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
  function getRowClass(index: number): string {
    if (index < advancingCount) return "bg-green-50";
    if (bestNextPlacedCount > 0 && index === advancingCount) return "bg-yellow-50";
    return "";
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500">
          <th className="py-2 pr-2">#</th>
          <th className="py-2 pr-2">Team</th>
          <th className="py-2 pr-2 text-center">P</th>
          <th className="py-2 pr-2 text-center">W</th>
          <th className="py-2 pr-2 text-center">D</th>
          <th className="py-2 pr-2 text-center">L</th>
          <th className="py-2 pr-2 text-center">GF</th>
          <th className="py-2 pr-2 text-center">GA</th>
          <th className="py-2 pr-2 text-center">GD</th>
          <th className="py-2 text-center font-bold">Pts</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.teamId} className={`border-b border-gray-100 ${getRowClass(i)}`}>
            <td className="py-1.5 pr-2 text-gray-500">{i + 1}</td>
            <td className="py-1.5 pr-2 font-medium">
              {teamNames.get(row.teamId) ?? row.teamId}
            </td>
            <td className="py-1.5 pr-2 text-center">{row.played}</td>
            <td className="py-1.5 pr-2 text-center">{row.won}</td>
            <td className="py-1.5 pr-2 text-center">{row.drawn}</td>
            <td className="py-1.5 pr-2 text-center">{row.lost}</td>
            <td className="py-1.5 pr-2 text-center">{row.goalsFor}</td>
            <td className="py-1.5 pr-2 text-center">{row.goalsAgainst}</td>
            <td className="py-1.5 pr-2 text-center">{row.goalDifference}</td>
            <td className="py-1.5 text-center font-bold">{row.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
