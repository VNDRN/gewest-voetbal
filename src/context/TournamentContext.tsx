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
} from "../types";
import { loadState, saveState } from "../persistence/localStorage";

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
    name: "Toernooi",
    date: new Date().toISOString().slice(0, 10),
    config: { fieldCount: 3, slotDurationMinutes: 20, startTime: "09:00" },
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
      score: { home: number; away: number };
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
      score: { home: number; away: number };
    }
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

export function useTournament(): Tournament {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error("useTournament must be used within TournamentProvider");
  return ctx;
}

export function useTournamentDispatch(): Dispatch<TournamentAction> {
  const ctx = useContext(TournamentDispatchContext);
  if (!ctx)
    throw new Error(
      "useTournamentDispatch must be used within TournamentProvider"
    );
  return ctx;
}
