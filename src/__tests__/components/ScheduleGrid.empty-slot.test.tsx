import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ScheduleGrid from "../../components/ScheduleGrid";
import type { ScheduledMatch } from "../../types";

function makeMatch(partial: Partial<ScheduledMatch> = {}): ScheduledMatch {
  return {
    id: "m0",
    homeTeamId: "a",
    awayTeamId: "b",
    fieldIndex: 0,
    timeSlot: 0,
    score: null,
    phase: "group",
    competitionId: "mens",
    groupName: "Groep A",
    ...partial,
  };
}

const teamNames = new Map([
  ["a", "Alpha"],
  ["b", "Beta"],
]);

describe("ScheduleGrid empty-slot row", () => {
  it("renders a per-field well for each field and calls onRemoveSlot when ✕ clicked", () => {
    const onRemoveSlot = vi.fn();
    const match = makeMatch({ timeSlot: 0, fieldIndex: 0 });

    render(
      <ScheduleGrid
        matches={[match]}
        allMatches={[match]}
        knockoutRoundInfos={[]}
        filter="all"
        fieldCount={2}
        slotCount={2}
        startTime="09:00"
        slotDurationMinutes={20}
        breaks={[]}
        teamNames={teamNames}
        onMatchClick={() => {}}
        onAddSlot={() => {}}
        onRemoveSlot={onRemoveSlot}
        onAddBreak={() => {}}
        onUpdateBreak={() => {}}
        onRemoveBreak={() => {}}
        onApplyChange={() => {}}
      />
    );

    // "Veld 1" / "Veld 2" appear both in thead headers and in the empty-slot wells
    expect(screen.getAllByText("Veld 1").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Veld 2").length).toBeGreaterThanOrEqual(2);

    const removeBtn = screen.getByRole("button", { name: /verwijder tijdslot/i });
    fireEvent.click(removeBtn);
    expect(onRemoveSlot).toHaveBeenCalledWith(1);
  });
});
