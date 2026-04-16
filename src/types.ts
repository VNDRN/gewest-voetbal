export type Tournament = {
  id: string;
  name: string;
  date: string;
  config: TournamentConfig;
  competitions: [Competition, Competition];
};

export type ScheduleBreak = {
  id: string;
  afterTimeSlot: number;
  durationMinutes: number;
};

export type TournamentConfig = {
  fieldCount: number;
  slotDurationMinutes: number;
  startTime: string;
  breaks: ScheduleBreak[];
  slotCount: number;
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

export type DraftGroup = {
  id: string;
  name: string;
  teamIds: string[];
};

export type Score = {
  home: number;
  away: number;
  penHome?: number;
  penAway?: number;
};

export type Match = {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  fieldIndex: number;
  timeSlot: number;
  score: Score | null;
  phase: "group" | "knockout";
};

export type KnockoutRound = {
  name: string;
  matches: KnockoutMatch[];
  isThirdPlace?: boolean;
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

export type ScheduledMatch = {
  id: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  fieldIndex: number;
  timeSlot: number;
  score: { home: number; away: number } | null;
  phase: "group" | "knockout";
  competitionId: string;
  groupName: string;
  homeSourceDescription?: string;
  awaySourceDescription?: string;
};
