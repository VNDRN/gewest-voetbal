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
    case "swap": {
      const a = matches.find((m) => m.id === change.matchAId);
      const b = matches.find((m) => m.id === change.matchBId);
      if (!a || !b) return matches;
      return matches.map((m) => {
        if (m.id === a.id) return { ...m, timeSlot: b.timeSlot, fieldIndex: b.fieldIndex };
        if (m.id === b.id) return { ...m, timeSlot: a.timeSlot, fieldIndex: a.fieldIndex };
        return m;
      });
    }
    case "insert":
      throw new Error(`applyChange: insert not implemented yet`);
  }
}
