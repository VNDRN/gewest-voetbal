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
  const hasPenalties = isComplete && match.score!.home === match.score!.away
    && match.score!.penHome != null && match.score!.penAway != null;
  const homeWins = isComplete && (
    match.score!.home > match.score!.away
    || (hasPenalties && match.score!.penHome! > match.score!.penAway!)
  );
  const awayWins = isComplete && (
    match.score!.away > match.score!.home
    || (hasPenalties && match.score!.penAway! > match.score!.penHome!)
  );

  return (
    <button
      onClick={canClick ? onClick : undefined}
      disabled={!canClick}
      className={`w-48 rounded-xl border p-3 text-left text-xs transition-colors ${
        canClick
          ? "border-card-hair bg-card hover:border-ink hover:shadow-sm cursor-pointer"
          : "border-dashed border-card-hair bg-surface cursor-default"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`font-semibold text-ink ${!match.homeTeamId ? "italic text-ink-muted" : ""}`}>
          {homeName}
        </span>
        {isComplete && (
          <span className="flex items-center gap-1">
            <span className={`font-black tabular-nums ${homeWins ? "text-ink" : "text-ink-muted"}`}>
              {match.score!.home}
            </span>
            {hasPenalties && (
              <span className="text-[10px] font-semibold text-ink-muted">({match.score!.penHome})</span>
            )}
          </span>
        )}
      </div>
      <div className="my-1 border-t border-card-hair" />
      <div className="flex items-center justify-between">
        <span className={`font-semibold text-ink ${!match.awayTeamId ? "italic text-ink-muted" : ""}`}>
          {awayName}
        </span>
        {isComplete && (
          <span className="flex items-center gap-1">
            <span className={`font-black tabular-nums ${awayWins ? "text-ink" : "text-ink-muted"}`}>
              {match.score!.away}
            </span>
            {hasPenalties && (
              <span className="text-[10px] font-semibold text-ink-muted">({match.score!.penAway})</span>
            )}
          </span>
        )}
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
        R{roundIndex + 1} / {match.id}
      </div>
    </button>
  );
}

function RoundColumn({
  name,
  matches,
  roundIndex,
  teamNames,
  onMatchClick,
}: {
  name: string;
  matches: KnockoutMatch[];
  roundIndex: number;
  teamNames: Map<string, string>;
  onMatchClick: (match: KnockoutMatch, roundIndex: number) => void;
}) {
  return (
    <div className="flex flex-col items-center">
      <h4 className="eyebrow mb-3">{name}</h4>
      <div className="flex flex-col justify-around gap-4 flex-1">
        {matches.map((match) => (
          <MatchSlot
            key={match.id}
            match={match}
            roundIndex={roundIndex}
            teamNames={teamNames}
            onClick={() => onMatchClick(match, roundIndex)}
          />
        ))}
      </div>
    </div>
  );
}

export default function BracketView({ rounds, teamNames, onMatchClick }: Props) {
  if (rounds.length === 0) return null;

  if (rounds.length === 1) {
    return (
      <div className="flex justify-center pb-4">
        <RoundColumn
          name={rounds[0].name}
          matches={rounds[0].matches}
          roundIndex={0}
          teamNames={teamNames}
          onMatchClick={onMatchClick}
        />
      </div>
    );
  }

  const thirdPlaceIdx = rounds.findIndex((r) => r.isThirdPlace);
  const thirdPlaceRound = thirdPlaceIdx !== -1 ? rounds[thirdPlaceIdx] : null;

  const mainRounds = rounds.filter((r) => !r.isThirdPlace);
  const finalRound = mainRounds[mainRounds.length - 1];
  const finalRoundIdx = rounds.indexOf(finalRound);
  const bracketRounds = mainRounds.slice(0, -1);

  const leftColumns = bracketRounds.map((round) => ({
    name: round.name,
    matches: round.matches.slice(0, round.matches.length / 2),
    roundIndex: rounds.indexOf(round),
  }));

  const rightColumns = [...bracketRounds]
    .map((round) => ({
      name: round.name,
      matches: round.matches.slice(round.matches.length / 2),
      roundIndex: rounds.indexOf(round),
    }))
    .reverse();

  return (
    <div className="flex gap-8 overflow-x-auto pb-4 justify-center">
      {leftColumns.map((col) => (
        <RoundColumn
          key={`left-${col.roundIndex}`}
          name={col.name}
          matches={col.matches}
          roundIndex={col.roundIndex}
          teamNames={teamNames}
          onMatchClick={onMatchClick}
        />
      ))}

      <div className="flex flex-col items-center gap-6">
        <RoundColumn
          name={finalRound.name}
          matches={finalRound.matches}
          roundIndex={finalRoundIdx}
          teamNames={teamNames}
          onMatchClick={onMatchClick}
        />
        {thirdPlaceRound && (
          <RoundColumn
            name={thirdPlaceRound.name}
            matches={thirdPlaceRound.matches}
            roundIndex={thirdPlaceIdx}
            teamNames={teamNames}
            onMatchClick={onMatchClick}
          />
        )}
      </div>

      {rightColumns.map((col) => (
        <RoundColumn
          key={`right-${col.roundIndex}`}
          name={col.name}
          matches={col.matches}
          roundIndex={col.roundIndex}
          teamNames={teamNames}
          onMatchClick={onMatchClick}
        />
      ))}
    </div>
  );
}
