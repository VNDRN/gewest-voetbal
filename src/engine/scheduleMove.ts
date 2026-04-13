import type { ScheduledMatch } from "../components/ScheduleGrid";

export type MoveChange = {
  kind: "move";
  matchId: string;
  toSlot: number;
  toField: number;
};

export type SwapChange = {
  kind: "swap";
  matchAId: string;
  matchBId: string;
};

export type InsertChange = {
  kind: "insert";
  matchId: string;
  atSlot: number;
  toField: number;
};

export type Change = MoveChange | SwapChange | InsertChange;

export function applyChange(
  matches: ScheduledMatch[],
  change: Change
): ScheduledMatch[] {
  switch (change.kind) {
    case "move":
      return matches.map((m) =>
        m.id === change.matchId
          ? { ...m, timeSlot: change.toSlot, fieldIndex: change.toField }
          : m
      );
    case "swap":
    case "insert":
      throw new Error(`applyChange: ${change.kind} not implemented yet`);
  }
}
