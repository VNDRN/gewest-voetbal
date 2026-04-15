import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GhostCard } from "../../components/GhostCard";
import type { ScheduledMatch } from "../../types";

function m(partial: Partial<ScheduledMatch> = {}): ScheduledMatch {
  return {
    id: "x",
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

const names = new Map([
  ["a", "Team Alpha"],
  ["b", "Team Beta"],
]);

describe("GhostCard", () => {
  it("renders pill label + both team names", () => {
    render(<GhostCard match={m()} teamNames={names} />);
    expect(screen.getByText("Team Alpha")).toBeInTheDocument();
    expect(screen.getByText("Team Beta")).toBeInTheDocument();
    expect(screen.getByText(/Heren/)).toBeInTheDocument();
  });

  it("does NOT render an action chip when chipKind is omitted", () => {
    const { container } = render(<GhostCard match={m()} teamNames={names} />);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders an action chip when chipKind is provided", () => {
    const { container } = render(
      <GhostCard match={m()} teamNames={names} chipKind="swap" />
    );
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("applies the ghost styling (opacity + dashed border)", () => {
    const { container } = render(<GhostCard match={m()} teamNames={names} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("border-dashed");
    expect(root.style.opacity).toBe("0.55");
    expect(root.style.transform).toContain("scale(0.96)");
  });
});
