import type { Match } from "../types";

type Props = {
  match: Match;
  teamNames: Map<string, string>;
  onClick: () => void;
};

export default function MatchCard({ match, teamNames, onClick }: Props) {
  const home = teamNames.get(match.homeTeamId) ?? match.homeTeamId;
  const away = teamNames.get(match.awayTeamId) ?? match.awayTeamId;

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-colors hover:border-blue-300 hover:bg-blue-50"
    >
      <span className="font-medium">{home}</span>
      <span className="mx-2 rounded bg-gray-100 px-2 py-0.5 font-mono text-xs">
        {match.score
          ? match.score.home === match.score.away && match.score.penHome != null
            ? `${match.score.home}-${match.score.away} (${match.score.penHome}-${match.score.penAway} pen)`
            : `${match.score.home} - ${match.score.away}`
          : "vs"}
      </span>
      <span className="font-medium">{away}</span>
    </button>
  );
}
