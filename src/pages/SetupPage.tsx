import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useTournament,
  useTournamentDispatch,
} from "../context/TournamentContext";
import type { Competition, DraftGroup, Group, KnockoutRound, Match, Team } from "../types";
import { createDraft } from "../engine/draft";
import GroupDraftEditor from "../components/GroupDraftEditor";
import {
  getGroupOptions,
  generateRoundRobinMatches,
  calculateBracketFill,
  maxAdvancingPerGroup,
} from "../engine/groups";
import { scheduleMatches } from "../engine/scheduler";
import { generateKnockoutRounds } from "../engine/knockout";
import { formatTime } from "../engine/time";

function CompetitionSetup({ competition }: { competition: Competition }) {
  const dispatch = useTournamentDispatch();
  const [teamName, setTeamName] = useState("");

  const groupOptions = useMemo(
    () => getGroupOptions(competition.teams.length),
    [competition.teams.length]
  );

  const selectedOption = groupOptions.find(
    (o) => o.sizes[0] === competition.config.groupSize
  );
  const groupCount = selectedOption?.groupCount ?? 0;

  const bracketFill = useMemo(
    () =>
      calculateBracketFill(groupCount, competition.config.advancingPerGroup),
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    [groupCount, competition.config.advancingPerGroup]
  );

  function addTeam() {
    const name = teamName.trim();
    if (!name) return;
    const team: Team = {
      id: crypto.randomUUID(),
      name,
      groupId: "",
    };
    dispatch({ type: "ADD_TEAM", competitionId: competition.id, team });
    setTeamName("");
  }

  function removeTeam(teamId: string) {
    dispatch({ type: "REMOVE_TEAM", competitionId: competition.id, teamId });
  }

  const maxAdvancing = selectedOption
    ? maxAdvancingPerGroup(selectedOption.sizes)
    : 1;

  useEffect(() => {
    if (competition.config.advancingPerGroup > maxAdvancing) {
      dispatch({
        type: "UPDATE_COMPETITION_CONFIG",
        competitionId: competition.id,
        config: { advancingPerGroup: maxAdvancing },
      });
    }
  }, [maxAdvancing, competition.config.advancingPerGroup, competition.id, dispatch]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 text-lg font-semibold">{competition.name}</h3>

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Teams ({competition.teams.length})
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTeam()}
            placeholder="Teamnaam"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={addTeam}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Toevoegen
          </button>
        </div>
        {competition.teams.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {competition.teams.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm"
              >
                {t.name}
                <button
                  onClick={() => removeTeam(t.id)}
                  className="ml-1 text-gray-400 hover:text-red-500"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {groupOptions.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Groepsindeling
            </label>
            <select
              value={competition.config.groupSize}
              onChange={(e) =>
                dispatch({
                  type: "UPDATE_COMPETITION_CONFIG",
                  competitionId: competition.id,
                  config: { groupSize: Number(e.target.value) },
                })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {groupOptions.map((o) => (
                <option key={o.sizes[0]} value={o.sizes[0]}>
                  {o.groupCount} groepen ({o.label})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Doorgang per groep
            </label>
            <select
              value={competition.config.advancingPerGroup}
              onChange={(e) =>
                dispatch({
                  type: "UPDATE_COMPETITION_CONFIG",
                  competitionId: competition.id,
                  config: { advancingPerGroup: Number(e.target.value) },
                })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {Array.from({ length: maxAdvancing }, (_, i) => i + 1).map(
                (n) => (
                  <option key={n} value={n}>
                    Top {n}
                  </option>
                )
              )}
            </select>
          </div>
        </div>
      )}

      {groupOptions.length > 0 && (
        <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
          <p>
            <strong>Knock-out:</strong>{" "}
            {groupCount * competition.config.advancingPerGroup +
              bracketFill.bestNextPlacedCount}{" "}
            teams (top {competition.config.advancingPerGroup}
            {bracketFill.bestNextPlacedCount > 0 && (
              <> + {bracketFill.bestNextPlacedCount} beste volgende</>
            )}
            )
          </p>
        </div>
      )}

      {competition.teams.length > 0 && groupOptions.length === 0 && (
        <p className="mt-3 text-sm text-amber-600">
          Minstens 6 teams nodig voor groepsopties.
        </p>
      )}
    </div>
  );
}

export default function SetupPage() {
  const tournament = useTournament();
  const dispatch = useTournamentDispatch();
  const navigate = useNavigate();

  const [draftGroups, setDraftGroups] = useState<Map<string, DraftGroup[]> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftGroups(null);
  }, [tournament.competitions]);

  const estimatedSlots = useMemo(() => {
    let totalGroupMatches = 0;
    const knockoutMatchesByRound: number[] = [];

    for (const comp of tournament.competitions) {
      const opts = getGroupOptions(comp.teams.length);
      if (opts.length === 0) continue;
      const opt = opts.find((o) => o.sizes[0] === comp.config.groupSize);
      if (!opt) continue;
      for (const size of opt.sizes) {
        totalGroupMatches += (size * (size - 1)) / 2;
      }
      const bf = calculateBracketFill(opt.groupCount, comp.config.advancingPerGroup);
      let bracketSize = bf.knockoutSize;
      let roundIdx = 0;
      while (bracketSize >= 2) {
        knockoutMatchesByRound[roundIdx] =
          (knockoutMatchesByRound[roundIdx] ?? 0) + bracketSize / 2;
        // Add kleine finale slot before the final
        if (bracketSize === 2 && bf.knockoutSize >= 4) {
          knockoutMatchesByRound[roundIdx + 1] =
            (knockoutMatchesByRound[roundIdx + 1] ?? 0) + 1;
          roundIdx++;
        }
        bracketSize /= 2;
        roundIdx++;
      }
    }
    if (totalGroupMatches === 0) return 0;
    const groupSlots = Math.ceil(totalGroupMatches / tournament.config.fieldCount);
    const knockoutSlots = knockoutMatchesByRound.reduce(
      (sum, count) => sum + Math.ceil(count / tournament.config.fieldCount),
      0
    );
    return groupSlots + knockoutSlots;
  }, [tournament.competitions, tournament.config.fieldCount]);

  function handleDraw() {
    const draft = new Map<string, DraftGroup[]>();
    for (const comp of tournament.competitions) {
      const groups = createDraft(comp);
      if (groups.length > 0) {
        draft.set(comp.id, groups);
      }
    }
    if (draft.size > 0) setDraftGroups(draft);
  }

  function handleDraftChange(compId: string, groups: DraftGroup[]) {
    setDraftGroups((prev) => {
      const next = new Map(prev);
      next.set(compId, groups);
      return next;
    });
  }

  function handleConfirm() {
    if (!draftGroups) return;

    dispatch({ type: "UPDATE_CONFIG", config: { breaks: [] } });
    const allMatches: { match: Match; compId: string; groupId: string }[] = [];
    const groupsPerComp: Map<string, Group[]> = new Map();

    for (const [compId, draft] of draftGroups) {
      const teamGroups: Record<string, string> = {};
      for (const g of draft) {
        for (const teamId of g.teamIds) {
          teamGroups[teamId] = g.id;
        }
      }

      dispatch({ type: "SET_TEAM_GROUPS", competitionId: compId, teamGroups });

      const groups: Group[] = draft.map((g) => {
        const matches = generateRoundRobinMatches(g.teamIds, g.id);
        for (const m of matches) {
          allMatches.push({ match: m, compId, groupId: g.id });
        }
        return { ...g, matches: [] };
      });

      groupsPerComp.set(compId, groups);
    }

    const scheduled = scheduleMatches(
      allMatches.map((m) => m.match),
      tournament.config.fieldCount
    );

    const scheduledMap = new Map<string, Match>();
    for (const m of scheduled) scheduledMap.set(m.id, m);

    const knockoutRoundsPerComp = new Map<string, KnockoutRound[]>();

    for (const [compId, groups] of groupsPerComp) {
      const finalGroups = groups.map((g) => {
        const groupMatches = allMatches
          .filter((m) => m.compId === compId && m.groupId === g.id)
          .map((m) => scheduledMap.get(m.match.id)!)
          .filter(Boolean);
        return { ...g, matches: groupMatches };
      });

      dispatch({ type: "SET_GROUPS", competitionId: compId, groups: finalGroups });

      const comp = tournament.competitions.find((c) => c.id === compId)!;
      const opt = getGroupOptions(comp.teams.length).find(
        (o) => o.sizes[0] === comp.config.groupSize
      );
      if (opt) {
        const bf = calculateBracketFill(opt.groupCount, comp.config.advancingPerGroup);
        dispatch({
          type: "UPDATE_COMPETITION_CONFIG",
          competitionId: compId,
          config: {
            knockoutSize: bf.knockoutSize,
            bestNextPlacedCount: bf.bestNextPlacedCount,
          },
        });
        knockoutRoundsPerComp.set(compId, generateKnockoutRounds(bf.knockoutSize));
      }
    }

    const maxGroupSlot = scheduled.reduce((max, m) => Math.max(max, m.timeSlot), -1);
    if (maxGroupSlot >= 0) {
      dispatch({
        type: "ADD_BREAK",
        breakItem: {
          id: crypto.randomUUID(),
          afterTimeSlot: maxGroupSlot,
          durationMinutes: 10,
        },
      });
    }
    let nextSlot = maxGroupSlot + 1;
    const maxRoundCount = Math.max(
      ...Array.from(knockoutRoundsPerComp.values()).map((r) => r.length),
      0
    );

    for (let offset = maxRoundCount - 1; offset >= 0; offset--) {
      let fieldIdx = 0;
      for (const [, rounds] of knockoutRoundsPerComp) {
        const roundIdx = rounds.length - 1 - offset;
        if (roundIdx < 0) continue;
        for (const match of rounds[roundIdx].matches) {
          match.fieldIndex = fieldIdx;
          match.timeSlot = nextSlot;
          fieldIdx++;
          if (fieldIdx >= tournament.config.fieldCount) {
            fieldIdx = 0;
            nextSlot++;
          }
        }
      }
      if (fieldIdx > 0) nextSlot++;
    }

    for (const [compId, rounds] of knockoutRoundsPerComp) {
      dispatch({
        type: "SET_KNOCKOUT_ROUNDS",
        competitionId: compId,
        knockoutRounds: rounds,
      });
    }

    navigate("/groups");
  }

  const canGenerate = tournament.competitions.some(
    (c) => getGroupOptions(c.teams.length).length > 0
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold">Toernooi-instellingen</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Naam
            </label>
            <input
              type="text"
              value={tournament.name}
              onChange={(e) =>
                dispatch({ type: "UPDATE_NAME", name: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Datum
            </label>
            <input
              type="date"
              value={tournament.date}
              onChange={(e) =>
                dispatch({ type: "UPDATE_DATE", date: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Velden
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={tournament.config.fieldCount}
              onChange={(e) =>
                dispatch({
                  type: "UPDATE_CONFIG",
                  config: { fieldCount: Math.max(1, Number(e.target.value)) },
                })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tijdslot (min)
            </label>
            <input
              type="number"
              min={5}
              max={120}
              value={tournament.config.slotDurationMinutes}
              onChange={(e) =>
                dispatch({
                  type: "UPDATE_CONFIG",
                  config: {
                    slotDurationMinutes: Math.max(5, Number(e.target.value)),
                  },
                })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Starttijd
            </label>
            <input
              type="time"
              value={tournament.config.startTime}
              onChange={(e) =>
                dispatch({
                  type: "UPDATE_CONFIG",
                  config: { startTime: e.target.value },
                })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {tournament.competitions.map((comp) => (
          <CompetitionSetup key={comp.id} competition={comp} />
        ))}
      </div>

      {estimatedSlots > 0 && (
        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
          Geschat: {estimatedSlots} tijdsloten ({formatTime(0, tournament.config.startTime, tournament.config.slotDurationMinutes, tournament.config.breaks)} -{" "}
          {formatTime(estimatedSlots, tournament.config.startTime, tournament.config.slotDurationMinutes, tournament.config.breaks)})
        </div>
      )}

      {draftGroups ? (
        <GroupDraftEditor
          competitions={tournament.competitions.filter((c) =>
            draftGroups.has(c.id)
          )}
          draftGroups={draftGroups}
          onDraftChange={handleDraftChange}
          onConfirm={handleConfirm}
          onRedraw={handleDraw}
        />
      ) : (
        <button
          onClick={handleDraw}
          disabled={!canGenerate}
          className="w-full rounded-xl bg-green-600 py-3 text-lg font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Groepen loten
        </button>
      )}
    </div>
  );
}
