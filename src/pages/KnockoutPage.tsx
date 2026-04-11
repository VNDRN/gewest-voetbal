import { useState, useMemo } from "react";
import {
  useTournament,
  useTournamentDispatch,
} from "../context/TournamentContext";
import CompetitionToggle from "../components/CompetitionToggle";
import BracketView from "../components/BracketView";
import ScoreInput from "../components/ScoreInput";
import { calculateStandings, rankBestNextPlaced } from "../engine/standings";
import {
  generateKnockoutRounds,
  seedBracket,
  advanceWinner,
} from "../engine/knockout";
import type { KnockoutMatch } from "../types";

export default function KnockoutPage() {
  const tournament = useTournament();
  const dispatch = useTournamentDispatch();
  const [activeComp, setActiveComp] = useState("mens");
  const [editingMatch, setEditingMatch] = useState<{
    match: KnockoutMatch;
    roundIndex: number;
  } | null>(null);

  const competition = tournament.competitions.find((c) => c.id === activeComp)!;

  const teamNames = useMemo(
    () => new Map(competition.teams.map((t) => [t.id, t.name])),
    [competition.teams]
  );

  const allGroupsPlayed = useMemo(() => {
    if (competition.groups.length === 0) return false;
    return competition.groups.every((g) =>
      g.matches.every((m) => m.score !== null)
    );
  }, [competition.groups]);

  const champion = useMemo(() => {
    const rounds = competition.knockoutRounds;
    if (rounds.length === 0) return null;
    const final = rounds[rounds.length - 1].matches[0];
    if (!final?.score) return null;
    const winnerId =
      final.score.home > final.score.away
        ? final.homeTeamId
        : final.score.away > final.score.home
          ? final.awayTeamId
          : final.homeTeamId;
    return winnerId ? (teamNames.get(winnerId) ?? winnerId) : null;
  }, [competition.knockoutRounds, teamNames]);

  function generateBracket() {
    const qualifyingTeams: { teamId: string; groupId: string }[] = [];

    for (const group of competition.groups) {
      const standings = calculateStandings(group.teamIds, group.matches);
      for (let i = 0; i < competition.config.advancingPerGroup && i < standings.length; i++) {
        qualifyingTeams.push({
          teamId: standings[i].teamId,
          groupId: group.id,
        });
      }
    }

    if (competition.config.bestNextPlacedCount > 0) {
      const nextPlaced = [];
      for (const group of competition.groups) {
        const standings = calculateStandings(group.teamIds, group.matches);
        const row = standings[competition.config.advancingPerGroup];
        if (row) nextPlaced.push({ ...row, groupId: group.id });
      }

      const ranked = rankBestNextPlaced(nextPlaced);
      for (let i = 0; i < competition.config.bestNextPlacedCount && i < ranked.length; i++) {
        const row = ranked[i];
        const gId = (row as typeof ranked[number] & { groupId: string }).groupId;
        qualifyingTeams.push({ teamId: row.teamId, groupId: gId });
      }
    }

    const rounds = generateKnockoutRounds(competition.config.knockoutSize);
    const seeded = seedBracket(rounds, qualifyingTeams);

    dispatch({
      type: "SET_KNOCKOUT_ROUNDS",
      competitionId: competition.id,
      knockoutRounds: seeded,
    });
  }

  if (competition.knockoutRounds.length > 0) {
    return (
      <div className="space-y-4">
        <CompetitionToggle activeId={activeComp} onChange={setActiveComp} />

        {champion && (
          <div className="rounded-xl border-2 border-yellow-400 bg-yellow-50 p-6 text-center">
            <div className="text-4xl">🏆</div>
            <div className="mt-2 text-2xl font-bold text-yellow-800">
              {champion}
            </div>
            <div className="text-sm text-yellow-600">
              {competition.name} Kampioen
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <BracketView
            rounds={competition.knockoutRounds}
            teamNames={teamNames}
            onMatchClick={(match, roundIndex) =>
              setEditingMatch({ match, roundIndex })
            }
          />
        </div>

        {editingMatch && (
          <ScoreInput
            homeTeam={
              editingMatch.match.homeTeamId
                ? (teamNames.get(editingMatch.match.homeTeamId) ?? "Thuis")
                : "Thuis"
            }
            awayTeam={
              editingMatch.match.awayTeamId
                ? (teamNames.get(editingMatch.match.awayTeamId) ?? "Uit")
                : "Uit"
            }
            initialScore={editingMatch.match.score}
            onClose={() => setEditingMatch(null)}
            onSave={(score) => {
              dispatch({
                type: "SET_KNOCKOUT_SCORE",
                competitionId: competition.id,
                roundIndex: editingMatch.roundIndex,
                matchId: editingMatch.match.id,
                score,
              });

              const updatedRounds = competition.knockoutRounds.map((r, ri) =>
                ri === editingMatch.roundIndex
                  ? {
                      ...r,
                      matches: r.matches.map((m) =>
                        m.id === editingMatch.match.id ? { ...m, score } : m
                      ),
                    }
                  : r
              );
              const advanced = advanceWinner(updatedRounds, editingMatch.match.id);
              dispatch({
                type: "SET_KNOCKOUT_ROUNDS",
                competitionId: competition.id,
                knockoutRounds: advanced,
              });

              setEditingMatch(null);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CompetitionToggle activeId={activeComp} onChange={setActiveComp} />

      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        {competition.groups.length === 0 ? (
          <p className="text-gray-500">
            Nog geen groepen. Genereer eerst de loting vanuit Instellingen.
          </p>
        ) : !allGroupsPlayed ? (
          <p className="text-gray-500">
            Voltooi eerst alle groepswedstrijden voordat je de knock-outfase genereert.
          </p>
        ) : (
          <div>
            <p className="mb-4 text-gray-600">
              Alle groepswedstrijden zijn gespeeld! Klaar om de knock-outfase te genereren.
            </p>
            <button
              onClick={generateBracket}
              className="rounded-xl bg-green-600 px-8 py-3 text-lg font-semibold text-white hover:bg-green-700"
            >
              Knock-outfase genereren
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
