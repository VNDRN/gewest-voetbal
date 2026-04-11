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
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          No groups yet. Head to Setup to generate the draw.
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
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <h3 className="mb-3 text-base font-semibold">{group.name}</h3>
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
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <h3 className="mb-3 text-base font-semibold">
            Best Next-Placed ({competition.config.bestNextPlacedCount} qualify)
          </h3>
          <StandingsTable
            rows={bestNextPlacedRows}
            advancingCount={competition.config.bestNextPlacedCount}
            bestNextPlacedCount={0}
            teamNames={teamNames}
          />
        </div>
      )}

      <div className="flex gap-2 text-xs text-gray-500">
        <span className="inline-block h-3 w-3 rounded bg-green-100 border border-green-200" /> Advancing
        {competition.config.bestNextPlacedCount > 0 && (
          <>
            <span className="ml-2 inline-block h-3 w-3 rounded bg-yellow-100 border border-yellow-200" /> Best next-placed contender
          </>
        )}
      </div>

      {editingMatch && (
        <ScoreInput
          homeTeam={teamNames.get(editingMatch.match.homeTeamId) ?? "Home"}
          awayTeam={teamNames.get(editingMatch.match.awayTeamId) ?? "Away"}
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
