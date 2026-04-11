import { useState, useMemo } from "react";
import {
  useTournament,
  useTournamentDispatch,
} from "../context/TournamentContext";
import ScheduleGrid from "../components/ScheduleGrid";
import type { ScheduledMatch } from "../components/ScheduleGrid";
import ScoreInput from "../components/ScoreInput";

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
          teamNames={teamNames}
          onMatchClick={setEditingMatch}
        />
      </div>

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
