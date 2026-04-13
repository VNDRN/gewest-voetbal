import { useState, useMemo } from "react";
import {
  useTournament,
  useTournamentDispatch,
} from "../context/TournamentContext";
import ScheduleGrid from "../components/ScheduleGrid";
import type { ScheduledMatch } from "../components/ScheduleGrid";
import type { Change, KnockoutRoundInfo } from "../engine/scheduleMove";
import ScoreInput from "../components/ScoreInput";
import { calculateStandings, rankBestNextPlaced } from "../engine/standings";
import { seedBracket, advanceWinner } from "../engine/knockout";

type Filter = "all" | "mens" | "womens";

export default function SchedulePage() {
  const tournament = useTournament();
  const dispatch = useTournamentDispatch();
  const [filter, setFilter] = useState<Filter>("all");
  const [editingMatch, setEditingMatch] = useState<ScheduledMatch | null>(null);

  const teamNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const comp of tournament.competitions) {
      for (const t of comp.teams) map.set(t.id, t.name);
    }
    return map;
  }, [tournament.competitions]);

  const allMatches: ScheduledMatch[] = useMemo(() => {
    const matches: ScheduledMatch[] = [];
    for (const comp of tournament.competitions) {
      for (const group of comp.groups) {
        for (const match of group.matches) {
          matches.push({
            ...match,
            competitionId: comp.id,
            groupName: group.name,
          });
        }
      }
      for (const round of comp.knockoutRounds) {
        for (const match of round.matches) {
          matches.push({
            ...match,
            competitionId: comp.id,
            groupName: round.name,
          });
        }
      }
    }
    return matches.sort((a, b) => a.timeSlot - b.timeSlot || a.fieldIndex - b.fieldIndex);
  }, [tournament.competitions]);

  const filteredMatches = useMemo(
    () =>
      filter === "all"
        ? allMatches
        : allMatches.filter((m) => m.competitionId === filter),
    [allMatches, filter]
  );

  const knockoutStatus = useMemo(
    () =>
      tournament.competitions.map((comp) => ({
        compId: comp.id,
        compName: comp.name,
        allPlayed:
          comp.groups.length > 0 &&
          comp.groups.every((g) => g.matches.every((m) => m.score !== null)),
        seeded:
          comp.knockoutRounds.length > 0 &&
          comp.knockoutRounds[0].matches.some((m) => m.homeTeamId !== null),
      })),
    [tournament.competitions]
  );

  const knockoutRoundInfos: KnockoutRoundInfo[] = useMemo(() => {
    const out: KnockoutRoundInfo[] = [];
    for (const comp of tournament.competitions) {
      for (const r of comp.knockoutRounds) {
        out.push({
          competitionId: comp.id,
          name: r.name,
          matchIds: r.matches.map((m) => m.id),
          isThirdPlace: !!r.isThirdPlace,
        });
      }
    }
    return out;
  }, [tournament.competitions]);

  function generateBracket(compId: string) {
    const comp = tournament.competitions.find((c) => c.id === compId)!;
    const qualifyingTeams: { teamId: string; groupId: string }[] = [];

    for (let pos = 0; pos < comp.config.advancingPerGroup; pos++) {
      for (const group of comp.groups) {
        const standings = calculateStandings(group.teamIds, group.matches);
        if (pos < standings.length) {
          qualifyingTeams.push({
            teamId: standings[pos].teamId,
            groupId: group.id,
          });
        }
      }
    }

    if (comp.config.bestNextPlacedCount > 0) {
      const nextPlaced = [];
      for (const group of comp.groups) {
        const standings = calculateStandings(group.teamIds, group.matches);
        const row = standings[comp.config.advancingPerGroup];
        if (row) nextPlaced.push({ ...row, groupId: group.id });
      }
      const ranked = rankBestNextPlaced(nextPlaced);
      for (
        let i = 0;
        i < comp.config.bestNextPlacedCount && i < ranked.length;
        i++
      ) {
        const row = ranked[i];
        const gId = (row as typeof ranked[number] & { groupId: string })
          .groupId;
        qualifyingTeams.push({ teamId: row.teamId, groupId: gId });
      }
    }

    const seeded = seedBracket(comp.knockoutRounds, qualifyingTeams);
    dispatch({
      type: "SET_KNOCKOUT_ROUNDS",
      competitionId: comp.id,
      knockoutRounds: seeded,
    });
  }

  function findMatchGroup(matchId: string): { compId: string; groupId: string } | null {
    for (const comp of tournament.competitions) {
      for (const group of comp.groups) {
        if (group.matches.some((m) => m.id === matchId)) {
          return { compId: comp.id, groupId: group.id };
        }
      }
    }
    return null;
  }

  function findMatchKnockout(matchId: string): { compId: string; roundIndex: number } | null {
    for (const comp of tournament.competitions) {
      for (let ri = 0; ri < comp.knockoutRounds.length; ri++) {
        if (comp.knockoutRounds[ri].matches.some((m) => m.id === matchId)) {
          return { compId: comp.id, roundIndex: ri };
        }
      }
    }
    return null;
  }

  if (allMatches.length === 0) {
    return (
      <div className="rounded-2xl border border-card-hair bg-card p-8 text-center text-ink-soft">
        Nog geen schema. Genereer de loting vanuit Instellingen.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-xl bg-surface p-1">
        {([
          { id: "all", label: "Alles" },
          { id: "mens", label: "Heren" },
          { id: "womens", label: "Dames" },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
              filter === id
                ? "bg-card text-ink shadow-sm"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-card-hair bg-card p-4">
        <ScheduleGrid
          matches={filteredMatches}
          allMatches={allMatches}
          knockoutRoundInfos={knockoutRoundInfos}
          filter={filter}
          fieldCount={tournament.config.fieldCount}
          startTime={tournament.config.startTime}
          slotDurationMinutes={tournament.config.slotDurationMinutes}
          breaks={tournament.config.breaks}
          teamNames={teamNames}
          onMatchClick={setEditingMatch}
          onAddBreak={(afterTimeSlot) =>
            dispatch({
              type: "ADD_BREAK",
              breakItem: {
                id: crypto.randomUUID(),
                afterTimeSlot,
                durationMinutes: 10,
              },
            })
          }
          onUpdateBreak={(breakId, durationMinutes) =>
            dispatch({ type: "UPDATE_BREAK", breakId, durationMinutes })
          }
          onRemoveBreak={(breakId) =>
            dispatch({ type: "REMOVE_BREAK", breakId })
          }
          onApplyChange={(change: Change) =>
            dispatch({ type: "APPLY_SCHEDULE_CHANGE", change })
          }
        />
      </div>

      {knockoutStatus.some((s) => !s.seeded) && (
        <div className="space-y-2">
          {knockoutStatus.map(
            (s) =>
              !s.seeded && (
                <button
                  key={s.compId}
                  onClick={() => generateBracket(s.compId)}
                  disabled={!s.allPlayed}
                  className="w-full rounded-xl bg-ink py-3 text-lg font-bold text-white hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-ink/30"
                >
                  {s.compName} knock-outfase genereren
                </button>
              )
          )}
        </div>
      )}

      {editingMatch && (
        <ScoreInput
          homeTeam={teamNames.get(editingMatch.homeTeamId ?? "") ?? "Thuis"}
          awayTeam={teamNames.get(editingMatch.awayTeamId ?? "") ?? "Uit"}
          initialScore={editingMatch.score}
          isKnockout={editingMatch.phase === "knockout"}
          onClose={() => setEditingMatch(null)}
          onSave={(score) => {
            if (editingMatch.phase === "knockout") {
              const loc = findMatchKnockout(editingMatch.id);
              if (loc) {
                const comp = tournament.competitions.find((c) => c.id === loc.compId)!;
                dispatch({
                  type: "SET_KNOCKOUT_SCORE",
                  competitionId: loc.compId,
                  roundIndex: loc.roundIndex,
                  matchId: editingMatch.id,
                  score,
                });
                const updatedRounds = comp.knockoutRounds.map((r, ri) =>
                  ri === loc.roundIndex
                    ? {
                        ...r,
                        matches: r.matches.map((m) =>
                          m.id === editingMatch.id ? { ...m, score } : m
                        ),
                      }
                    : r
                );
                const advanced = advanceWinner(updatedRounds, editingMatch.id);
                dispatch({
                  type: "SET_KNOCKOUT_ROUNDS",
                  competitionId: loc.compId,
                  knockoutRounds: advanced,
                });
              }
            } else {
              const loc = findMatchGroup(editingMatch.id);
              if (loc) {
                dispatch({
                  type: "SET_SCORE",
                  competitionId: loc.compId,
                  groupId: loc.groupId,
                  matchId: editingMatch.id,
                  score,
                });
              }
            }
            setEditingMatch(null);
          }}
        />
      )}
    </div>
  );
}
