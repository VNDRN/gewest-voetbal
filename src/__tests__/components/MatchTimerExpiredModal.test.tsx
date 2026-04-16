import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MatchTimerExpiredModal from "../../components/MatchTimerExpiredModal";
import type { UseMatchTimerResult } from "../../hooks/useMatchTimer";

function makeTimer(overrides: Partial<UseMatchTimerResult> = {}): UseMatchTimerResult {
  return {
    status: "expired",
    durationSeconds: 1200,
    remainingSeconds: 0,
    customDuration: false,
    modalOpen: true,
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    reset: vi.fn(),
    editMinutes: vi.fn(),
    snoozeTwoMinutes: vi.fn(),
    startNextSlot: vi.fn(),
    dismissModal: vi.fn(),
    ...overrides,
  };
}

describe("MatchTimerExpiredModal", () => {
  it("does not render when modalOpen is false", () => {
    render(<MatchTimerExpiredModal timer={makeTimer({ modalOpen: false })} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders three action buttons when modalOpen is true", () => {
    render(<MatchTimerExpiredModal timer={makeTimer()} />);
    expect(screen.getByRole("button", { name: "+2 min" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sluiten" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Volgende slot starten" })).toBeInTheDocument();
  });

  it("clicking +2 min calls snoozeTwoMinutes", () => {
    const timer = makeTimer();
    render(<MatchTimerExpiredModal timer={timer} />);
    fireEvent.click(screen.getByRole("button", { name: "+2 min" }));
    expect(timer.snoozeTwoMinutes).toHaveBeenCalledTimes(1);
  });

  it("clicking Sluiten calls dismissModal", () => {
    const timer = makeTimer();
    render(<MatchTimerExpiredModal timer={timer} />);
    fireEvent.click(screen.getByRole("button", { name: "Sluiten" }));
    expect(timer.dismissModal).toHaveBeenCalledTimes(1);
  });

  it("clicking Volgende slot starten calls startNextSlot", () => {
    const timer = makeTimer();
    render(<MatchTimerExpiredModal timer={timer} />);
    fireEvent.click(screen.getByRole("button", { name: "Volgende slot starten" }));
    expect(timer.startNextSlot).toHaveBeenCalledTimes(1);
  });

  it("Escape key calls dismissModal", () => {
    const timer = makeTimer();
    render(<MatchTimerExpiredModal timer={timer} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(timer.dismissModal).toHaveBeenCalledTimes(1);
  });

  it("clicking backdrop calls dismissModal", () => {
    const timer = makeTimer();
    render(<MatchTimerExpiredModal timer={timer} />);
    fireEvent.click(screen.getByRole("dialog"));
    expect(timer.dismissModal).toHaveBeenCalledTimes(1);
  });

  it("clicking inside dialog content does NOT call dismissModal", () => {
    const timer = makeTimer();
    render(<MatchTimerExpiredModal timer={timer} />);
    fireEvent.click(screen.getByText("Tijd!"));
    expect(timer.dismissModal).not.toHaveBeenCalled();
  });
});
