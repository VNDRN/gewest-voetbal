export type Tournament = {
  id: string;
  name: string;
  date: string;
  config: TournamentConfig;
  competitions: [Competition, Competition];
};

export type TournamentConfig = {
  fieldCount: number;
  slotDurationMinutes: number;
  startTime: string;
};

export type Competition = {
  id: string;
  name: string;
  teams: Team[];
  groups: Group[];
  knockoutRounds: KnockoutRound[];
  config: CompetitionConfig;
};

export type CompetitionConfig = {
  groupSize: number;
  advancingPerGroup: number;
  bestNextPlacedCount: number;
  knockoutSize: number;
};

export type Team = {
  id: string;
  name: string;
  groupId: string;
};

export type Group = {
  id: string;
  name: string;
  teamIds: string[];
  matches: Match[];
};

export type Match = {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  fieldIndex: number;
  timeSlot: number;
  score: { home: number; away: number } | null;
  phase: "group" | "knockout";
};

export type KnockoutRound = {
  name: string;
  matches: KnockoutMatch[];
};

export type KnockoutMatch = Omit<Match, "homeTeamId" | "awayTeamId"> & {
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeSourceDescription: string;
  awaySourceDescription: string;
};

export type StandingRow = {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export type GroupOption = {
  groupCount: number;
  sizes: number[];
  label: string;
};
