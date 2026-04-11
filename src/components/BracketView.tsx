import type { KnockoutRound, KnockoutMatch } from "../types";

type Props = {
  rounds: KnockoutRound[];
  teamNames: Map<string, string>;
  onMatchClick: (match: KnockoutMatch, roundIndex: number) => void;
};

function MatchSlot({
  match,
  roundIndex,
  teamNames,
  onClick,
}: {
  match: KnockoutMatch;
  roundIndex: number;
  teamNames: Map<string, string>;
  onClick: () => void;
}) {
  const homeName = match.homeTeamId
    ? (teamNames.get(match.homeTeamId) ?? match.homeTeamId)
    : match.homeSourceDescription;
  const awayName = match.awayTeamId
    ? (teamNames.get(match.awayTeamId) ?? match.awayTeamId)
    : match.awaySourceDescription;

  const canClick = match.homeTeamId && match.awayTeamId;
  const isComplete = match.score !== null;

  return (
    <button
      onClick={canClick ? onClick : undefined}
      disabled={!canClick}
      className={`w-48 rounded-lg border p-2 text-left text-xs transition-colors ${
        canClick
          ? "border-gray-300 bg-white hover:border-blue-400 hover:shadow-sm cursor-pointer"
          : "border-dashed border-gray-200 bg-gray-50 cursor-default"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`font-medium ${!match.homeTeamId ? "text-gray-400 italic" : ""}`}>
          {homeName}
        </span>
        {isComplete && (
          <span className={`font-bold ${match.score!.home > match.score!.away ? "text-green-600" : "text-gray-500"}`}>
            {match.score!.home}
          </span>
        )}
      </div>
      <div className="my-0.5 border-t border-gray-100" />
      <div className="flex items-center justify-between">
        <span className={`font-medium ${!match.awayTeamId ? "text-gray-400 italic" : ""}`}>
          {awayName}
        </span>
        {isComplete && (
          <span className={`font-bold ${match.score!.away > match.score!.home ? "text-green-600" : "text-gray-500"}`}>
            {match.score!.away}
          </span>
        )}
      </div>
      <div className="mt-1 text-[10px] text-gray-400">
        R{roundIndex + 1} / {match.id}
      </div>
    </button>
  );
}

export default function BracketView({ rounds, teamNames, onMatchClick }: Props) {
  return (
    <div className="flex gap-8 overflow-x-auto pb-4">
      {rounds.map((round, ri) => (
        <div key={ri} className="flex flex-col items-center">
          <h4 className="mb-3 text-sm font-semibold text-gray-700">
            {round.name}
          </h4>
          <div className="flex flex-col justify-around gap-4 flex-1">
            {round.matches.map((match) => (
              <MatchSlot
                key={match.id}
                match={match}
                roundIndex={ri}
                teamNames={teamNames}
                onClick={() => onMatchClick(match, ri)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
