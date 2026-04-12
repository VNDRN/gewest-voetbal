import { useState, useMemo } from "react";
import {
  useTournament,
  useTournamentDispatch,
} from "../context/TournamentContext";
import ScheduleGrid from "../components/ScheduleGrid";
import type { ScheduledMatch } from "../components/ScheduleGrid";
import ScoreInput from "../components/ScoreInput";
import { calculateStandings, rankBestNextPlaced } from "../engine/standings";
import { seedBracket } from "../engine/knockout";

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

  if (allMatches.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
        Nog geen schema. Genereer de loting vanuit Instellingen.
      </div>
    );
  }

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
            onClick={() => setFilter(id)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <ScheduleGrid
          matches={filteredMatches}
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
                  className="w-full rounded-xl bg-green-600 py-3 text-lg font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {s.compName} knock-outfase genereren
                </button>
              )
          )}
        </div>
      )}

      {editingMatch && (
        <ScoreInput
          homeTeam={teamNames.get(editingMatch.homeTeamId) ?? "Thuis"}
          awayTeam={teamNames.get(editingMatch.awayTeamId) ?? "Uit"}
          initialScore={editingMatch.score}
          onClose={() => setEditingMatch(null)}
          onSave={(score) => {
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
            setEditingMatch(null);
          }}
        />
      )}
    </div>
  );
}
