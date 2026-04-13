import type { Match } from "../types";

type Props = {
  match: Match;
  teamNames: Map<string, string>;
  onClick: () => void;
};

export default function MatchCard({ match, teamNames, onClick }: Props) {
  const home = teamNames.get(match.homeTeamId) ?? match.homeTeamId;
  const away = teamNames.get(match.awayTeamId) ?? match.awayTeamId;

  const hasPenalties =
    match.score != null &&
    match.score.home === match.score.away &&
    match.score.penHome != null &&
    match.score.penAway != null;

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-5 rounded-2xl border border-card-hair bg-card px-6 py-5 transition-colors hover:bg-surface"
    >
      <span className="flex-1 text-right text-sm font-semibold text-ink-soft">
        {home}
      </span>
      {match.score ? (
        <span className="flex items-baseline gap-2 text-4xl font-black leading-none text-ink tabular-nums">
          <span>{match.score.home}</span>
          <span className="font-medium text-ink-muted">–</span>
          <span>{match.score.away}</span>
          {hasPenalties && (
            <span className="ml-2 text-xs font-semibold text-ink-muted">
              ({match.score.penHome}–{match.score.penAway} pen)
            </span>
          )}
        </span>
      ) : (
        <span className="text-2xl font-black leading-none text-ink-muted">—</span>
      )}
      <span className="flex-1 text-left text-sm font-semibold text-ink-soft">
        {away}
      </span>
    </button>
  );
}
