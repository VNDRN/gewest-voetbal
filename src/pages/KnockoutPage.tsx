import { useState, useMemo } from "react";
import {
  useTournament,
  useTournamentDispatch,
} from "../context/TournamentContext";
import BracketView from "../components/BracketView";
import ScoreInput from "../components/ScoreInput";
import { advanceWinner } from "../engine/knockout";
import type { KnockoutMatch } from "../types";

type Filter = "all" | "mens" | "womens";

export default function KnockoutPage() {
  const tournament = useTournament();
  const dispatch = useTournamentDispatch();
  const [activeComp, setActiveComp] = useState<Filter>("all");
  const [editingMatch, setEditingMatch] = useState<{
    match: KnockoutMatch;
    roundIndex: number;
    compId: string;
  } | null>(null);

  const teamNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const comp of tournament.competitions) {
      for (const t of comp.teams) map.set(t.id, t.name);
    }
    return map;
  }, [tournament.competitions]);

  const visibleComps =
    activeComp === "all"
      ? tournament.competitions
      : tournament.competitions.filter((c) => c.id === activeComp);

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg bg-gray-200 p-1">
        {([
          { id: "all", label: "Alles" },
          { id: "mens", label: "Heren" },
          { id: "womens", label: "Dames" },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveComp(id)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeComp === id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {visibleComps.map((comp) => {
        const isSeeded =
          comp.knockoutRounds.length > 0 &&
          comp.knockoutRounds[0].matches.some((m) => m.homeTeamId !== null);

        const rounds = comp.knockoutRounds;
        let champion: string | null = null;
        if (rounds.length > 0) {
          const final = rounds[rounds.length - 1].matches[0];
          if (final?.score) {
            let winnerId: string | null;
            if (final.score.home > final.score.away) {
              winnerId = final.homeTeamId;
            } else if (final.score.away > final.score.home) {
              winnerId = final.awayTeamId;
            } else if (final.score.penHome != null && final.score.penAway != null && final.score.penHome > final.score.penAway) {
              winnerId = final.homeTeamId;
            } else if (final.score.penHome != null && final.score.penAway != null && final.score.penAway > final.score.penHome) {
              winnerId = final.awayTeamId;
            } else {
              winnerId = null;
            }
            champion = winnerId
              ? (teamNames.get(winnerId) ?? winnerId)
              : null;
          }
        }

        return (
          <div key={comp.id} className="space-y-4">
            {activeComp === "all" && (
              <h3 className="text-lg font-semibold">{comp.name}</h3>
            )}

            {champion && (
              <div className="rounded-xl border-2 border-yellow-400 bg-yellow-50 p-6 text-center">
                <div className="text-4xl">🏆</div>
                <div className="mt-2 text-2xl font-bold text-yellow-800">
                  {champion}
                </div>
                <div className="text-sm text-yellow-600">
                  {comp.name} Kampioen
                </div>
              </div>
            )}

            {rounds.length > 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <BracketView
                  rounds={rounds}
                  teamNames={teamNames}
                  onMatchClick={
                    isSeeded
                      ? (match, roundIndex) =>
                          setEditingMatch({
                            match,
                            roundIndex,
                            compId: comp.id,
                          })
                      : () => {}
                  }
                />
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
                Nog geen groepen. Genereer eerst de loting vanuit Instellingen.
              </div>
            )}
          </div>
        );
      })}

      {editingMatch && (() => {
        const comp = tournament.competitions.find(
          (c) => c.id === editingMatch.compId
        )!;
        return (
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
            isKnockout
            onClose={() => setEditingMatch(null)}
            onSave={(score) => {
              dispatch({
                type: "SET_KNOCKOUT_SCORE",
                competitionId: comp.id,
                roundIndex: editingMatch.roundIndex,
                matchId: editingMatch.match.id,
                score,
              });

              const updatedRounds = comp.knockoutRounds.map((r, ri) =>
                ri === editingMatch.roundIndex
                  ? {
                      ...r,
                      matches: r.matches.map((m) =>
                        m.id === editingMatch.match.id ? { ...m, score } : m
                      ),
                    }
                  : r
              );
              const advanced = advanceWinner(
                updatedRounds,
                editingMatch.match.id
              );
              dispatch({
                type: "SET_KNOCKOUT_ROUNDS",
                competitionId: comp.id,
                knockoutRounds: advanced,
              });

              setEditingMatch(null);
            }}
          />
        );
      })()}
    </div>
  );
}
