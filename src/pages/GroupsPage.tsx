import { useState, useMemo } from "react";
import {
  useTournament,
  useTournamentDispatch,
} from "../context/TournamentContext";
import CompetitionToggle from "../components/CompetitionToggle";
import StandingsTable from "../components/StandingsTable";
import MatchCard from "../components/MatchCard";
import ScoreInput from "../components/ScoreInput";
import { calculateStandings, rankBestNextPlaced } from "../engine/standings";
import type { Match, StandingRow } from "../types";

export default function GroupsPage() {
  const tournament = useTournament();
  const dispatch = useTournamentDispatch();
  const [activeComp, setActiveComp] = useState("mens");
  const [editingMatch, setEditingMatch] = useState<{
    match: Match;
    groupId: string;
  } | null>(null);

  const competition = tournament.competitions.find((c) => c.id === activeComp)!;
  const teamNames = useMemo(
    () => new Map(competition.teams.map((t) => [t.id, t.name])),
    [competition.teams]
  );

  const bestNextPlacedRows = useMemo(() => {
    if (competition.config.bestNextPlacedCount === 0) return [];
    const candidates: StandingRow[] = [];
    for (const group of competition.groups) {
      const standings = calculateStandings(group.teamIds, group.matches);
      const row = standings[competition.config.advancingPerGroup];
      if (row) candidates.push(row);
    }
    return rankBestNextPlaced(candidates);
  }, [competition]);

  if (competition.groups.length === 0) {
    return (
      <div className="space-y-4">
        <CompetitionToggle activeId={activeComp} onChange={setActiveComp} />
        <div className="rounded-2xl border border-card-hair bg-card p-8 text-center text-ink-soft">
          Nog geen groepen. Ga naar Instellingen om de loting te genereren.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CompetitionToggle activeId={activeComp} onChange={setActiveComp} />

      <div className="grid gap-6 md:grid-cols-2">
        {competition.groups.map((group) => {
          const standings = calculateStandings(group.teamIds, group.matches);
          return (
            <div
              key={group.id}
              className="rounded-2xl border border-card-hair bg-card p-5"
            >
              <h3 className="display mb-4 text-xl text-ink">{group.name}</h3>
              <StandingsTable
                rows={standings}
                advancingCount={competition.config.advancingPerGroup}
                bestNextPlacedCount={competition.config.bestNextPlacedCount}
                teamNames={teamNames}
              />
              <div className="mt-3 space-y-1.5">
                {group.matches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    teamNames={teamNames}
                    onClick={() => setEditingMatch({ match, groupId: group.id })}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {bestNextPlacedRows.length > 0 && (
        <div className="rounded-2xl border border-card-hair bg-card p-5">
          <h3 className="mb-3 eyebrow">
            Beste volgende ({competition.config.bestNextPlacedCount} kwalificeren)
          </h3>
          <StandingsTable
            rows={bestNextPlacedRows}
            advancingCount={competition.config.bestNextPlacedCount}
            bestNextPlacedCount={0}
            teamNames={teamNames}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-[var(--color-advancing-tint)] border border-card-hair" />
          <span className="align-[1px] text-[10px] text-ink-muted">▲</span>
          Doorgang
        </span>
        {competition.config.bestNextPlacedCount > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-[var(--color-advancing-tint)] border border-card-hair" />
            Beste volgende kandidaat
          </span>
        )}
      </div>

      {editingMatch && (
        <ScoreInput
          homeTeam={teamNames.get(editingMatch.match.homeTeamId) ?? "Thuis"}
          awayTeam={teamNames.get(editingMatch.match.awayTeamId) ?? "Uit"}
          initialScore={editingMatch.match.score}
          onClose={() => setEditingMatch(null)}
          onSave={(score) => {
            dispatch({
              type: "SET_SCORE",
              competitionId: competition.id,
              groupId: editingMatch.groupId,
              matchId: editingMatch.match.id,
              score,
            });
            setEditingMatch(null);
          }}
        />
      )}
    </div>
  );
}
