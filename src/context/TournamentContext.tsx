import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
  type Dispatch,
} from "react";
import type {
  Tournament,
  Competition,
  CompetitionConfig,
  TournamentConfig,
  Team,
  Group,
  KnockoutRound,
  ScheduleBreak,
  Score,
} from "../types";
import { loadState, saveState } from "../persistence/localStorage";
import {
  validateChange,
  type Change,
  type KnockoutRoundInfo,
} from "../engine/scheduleMove";

function createEmptyCompetition(id: string, name: string): Competition {
  return {
    id,
    name,
    teams: [],
    groups: [],
    knockoutRounds: [],
    config: {
      groupSize: 4,
      advancingPerGroup: 2,
      bestNextPlacedCount: 0,
      knockoutSize: 8,
    },
  };
}

function createDefaultTournament(): Tournament {
  return {
    id: crypto.randomUUID(),
    name: "Gewest Voetbal",
    date: new Date().toISOString().slice(0, 10),
    config: { fieldCount: 3, slotDurationMinutes: 20, startTime: "09:00", breaks: [] },
    competitions: [
      createEmptyCompetition("mens", "Heren"),
      createEmptyCompetition("womens", "Dames"),
    ],
  };
}

export type TournamentAction =
  | { type: "SET_TOURNAMENT"; tournament: Tournament }
  | { type: "UPDATE_CONFIG"; config: Partial<TournamentConfig> }
  | { type: "UPDATE_NAME"; name: string }
  | { type: "UPDATE_DATE"; date: string }
  | { type: "ADD_TEAM"; competitionId: string; team: Team }
  | { type: "REMOVE_TEAM"; competitionId: string; teamId: string }
  | {
      type: "UPDATE_COMPETITION_CONFIG";
      competitionId: string;
      config: Partial<CompetitionConfig>;
    }
  | {
      type: "SET_TEAM_GROUPS";
      competitionId: string;
      teamGroups: Record<string, string>;
    }
  | { type: "SET_GROUPS"; competitionId: string; groups: Group[] }
  | {
      type: "SET_SCORE";
      competitionId: string;
      groupId: string;
      matchId: string;
      score: Score;
    }
  | {
      type: "SET_KNOCKOUT_ROUNDS";
      competitionId: string;
      knockoutRounds: KnockoutRound[];
    }
  | {
      type: "SET_KNOCKOUT_SCORE";
      competitionId: string;
      roundIndex: number;
      matchId: string;
      score: Score;
    }
  | { type: "ADD_BREAK"; breakItem: ScheduleBreak }
  | { type: "UPDATE_BREAK"; breakId: string; durationMinutes: number }
  | { type: "REMOVE_BREAK"; breakId: string }
  | { type: "APPLY_SCHEDULE_CHANGE"; change: Change }
  | { type: "RESET" };

function updateCompetition(
  state: Tournament,
  competitionId: string,
  updater: (c: Competition) => Competition
): Tournament {
  return {
    ...state,
    competitions: state.competitions.map((c) =>
      c.id === competitionId ? updater(c) : c
    ) as [Competition, Competition],
  };
}

function flattenMatches(state: Tournament) {
  type Flat = {
    id: string;
    homeTeamId: string | null;
    awayTeamId: string | null;
    fieldIndex: number;
    timeSlot: number;
    score: Score | null;
    phase: "group" | "knockout";
    competitionId: string;
    groupName: string;
  };
  const flat: Flat[] = [];
  const rounds: KnockoutRoundInfo[] = [];
  for (const comp of state.competitions) {
    for (const g of comp.groups) {
      for (const match of g.matches) {
        flat.push({
          ...match,
          competitionId: comp.id,
          groupName: g.name,
        });
      }
    }
    for (const r of comp.knockoutRounds) {
      rounds.push({
        competitionId: comp.id,
        name: r.name,
        matchIds: r.matches.map((m) => m.id),
        isThirdPlace: !!r.isThirdPlace,
      });
      for (const match of r.matches) {
        flat.push({
          ...match,
          competitionId: comp.id,
          groupName: r.name,
        });
      }
    }
  }
  return { flat, rounds };
}

function tournamentReducer(
  state: Tournament,
  action: TournamentAction
): Tournament {
  switch (action.type) {
    case "SET_TOURNAMENT":
      return action.tournament;

    case "UPDATE_CONFIG":
      return { ...state, config: { ...state.config, ...action.config } };

    case "UPDATE_NAME":
      return { ...state, name: action.name };

    case "UPDATE_DATE":
      return { ...state, date: action.date };

    case "ADD_TEAM":
      return updateCompetition(state, action.competitionId, (c) => ({
        ...c,
        teams: [...c.teams, action.team],
      }));

    case "REMOVE_TEAM":
      return updateCompetition(state, action.competitionId, (c) => ({
        ...c,
        teams: c.teams.filter((t) => t.id !== action.teamId),
      }));

    case "UPDATE_COMPETITION_CONFIG":
      return updateCompetition(state, action.competitionId, (c) => ({
        ...c,
        config: { ...c.config, ...action.config },
      }));

    case "SET_TEAM_GROUPS":
      return updateCompetition(state, action.competitionId, (c) => ({
        ...c,
        teams: c.teams.map((t) => ({
          ...t,
          groupId: action.teamGroups[t.id] ?? t.groupId,
        })),
      }));

    case "SET_GROUPS":
      return updateCompetition(state, action.competitionId, (c) => ({
        ...c,
        groups: action.groups,
      }));

    case "SET_SCORE":
      return updateCompetition(state, action.competitionId, (c) => ({
        ...c,
        groups: c.groups.map((g) =>
          g.id === action.groupId
            ? {
                ...g,
                matches: g.matches.map((m) =>
                  m.id === action.matchId ? { ...m, score: action.score } : m
                ),
              }
            : g
        ),
      }));

    case "SET_KNOCKOUT_ROUNDS":
      return updateCompetition(state, action.competitionId, (c) => ({
        ...c,
        knockoutRounds: action.knockoutRounds,
      }));

    case "SET_KNOCKOUT_SCORE":
      return updateCompetition(state, action.competitionId, (c) => ({
        ...c,
        knockoutRounds: c.knockoutRounds.map((r, ri) =>
          ri === action.roundIndex
            ? {
                ...r,
                matches: r.matches.map((m) =>
                  m.id === action.matchId ? { ...m, score: action.score } : m
                ),
              }
            : r
        ),
      }));

    case "ADD_BREAK":
      return {
        ...state,
        config: {
          ...state.config,
          breaks: [...state.config.breaks, action.breakItem],
        },
      };

    case "UPDATE_BREAK":
      return {
        ...state,
        config: {
          ...state.config,
          breaks: state.config.breaks.map((b) =>
            b.id === action.breakId
              ? { ...b, durationMinutes: action.durationMinutes }
              : b
          ),
        },
      };

    case "REMOVE_BREAK":
      return {
        ...state,
        config: {
          ...state.config,
          breaks: state.config.breaks.filter((b) => b.id !== action.breakId),
        },
      };

    case "APPLY_SCHEDULE_CHANGE": {
      const { flat, rounds } = flattenMatches(state);
      const res = validateChange(flat, action.change, { rounds });
      if (!res.ok) return state;
      const posById = new Map<string, { timeSlot: number; fieldIndex: number }>();
      for (const nm of res.next) {
        posById.set(nm.id, { timeSlot: nm.timeSlot, fieldIndex: nm.fieldIndex });
      }
      return {
        ...state,
        competitions: state.competitions.map((c) => ({
          ...c,
          groups: c.groups.map((g) => ({
            ...g,
            matches: g.matches.map((mm) => {
              const p = posById.get(mm.id);
              return p ? { ...mm, timeSlot: p.timeSlot, fieldIndex: p.fieldIndex } : mm;
            }),
          })),
          knockoutRounds: c.knockoutRounds.map((r) => ({
            ...r,
            matches: r.matches.map((mm) => {
              const p = posById.get(mm.id);
              return p ? { ...mm, timeSlot: p.timeSlot, fieldIndex: p.fieldIndex } : mm;
            }),
          })),
        })) as [Competition, Competition],
      };
    }

    case "RESET":
      return createDefaultTournament();
  }
}

const TournamentContext = createContext<Tournament | null>(null);
const TournamentDispatchContext =
  createContext<Dispatch<TournamentAction> | null>(null);

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    tournamentReducer,
    null,
    () => loadState() ?? createDefaultTournament()
  );

  useEffect(() => {
    saveState(state);
  }, [state]);

  return (
    <TournamentContext value={state}>
      <TournamentDispatchContext value={dispatch}>
        {children}
      </TournamentDispatchContext>
    </TournamentContext>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTournament(): Tournament {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error("useTournament must be used within TournamentProvider");
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTournamentDispatch(): Dispatch<TournamentAction> {
  const ctx = useContext(TournamentDispatchContext);
  if (!ctx)
    throw new Error(
      "useTournamentDispatch must be used within TournamentProvider"
    );
  return ctx;
}
