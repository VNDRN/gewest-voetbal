import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MatchTimer from "../../components/MatchTimer";
import type { UseMatchTimerResult } from "../../hooks/useMatchTimer";

function makeTimer(overrides: Partial<UseMatchTimerResult> = {}): UseMatchTimerResult {
  return {
    status: "idle",
    durationSeconds: 1200,
    remainingSeconds: 1200,
    customDuration: false,
    modalOpen: false,
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

describe("MatchTimer", () => {
  it("renders MM:SS with zero-padded minutes and seconds", () => {
    render(<MatchTimer timer={makeTimer({ remainingSeconds: 125 })} />);
    expect(screen.getByText("02:05")).toBeInTheDocument();
  });

  it("clicking play on idle calls start()", () => {
    const timer = makeTimer();
    render(<MatchTimer timer={timer} />);
    fireEvent.click(screen.getByLabelText("Timer starten"));
    expect(timer.start).toHaveBeenCalledTimes(1);
  });

  it("clicking play on running calls pause()", () => {
    const timer = makeTimer({ status: "running", remainingSeconds: 1100 });
    render(<MatchTimer timer={timer} />);
    fireEvent.click(screen.getByLabelText("Timer pauzeren"));
    expect(timer.pause).toHaveBeenCalledTimes(1);
  });

  it("clicking play on paused calls resume()", () => {
    const timer = makeTimer({ status: "paused", remainingSeconds: 1000 });
    render(<MatchTimer timer={timer} />);
    fireEvent.click(screen.getByLabelText("Timer hervatten"));
    expect(timer.resume).toHaveBeenCalledTimes(1);
  });

  it("clicking play on expired calls startNextSlot()", () => {
    const timer = makeTimer({ status: "expired", remainingSeconds: 0 });
    render(<MatchTimer timer={timer} />);
    fireEvent.click(screen.getByLabelText("Timer starten"));
    expect(timer.startNextSlot).toHaveBeenCalledTimes(1);
  });

  it("clicking reset calls reset()", () => {
    const timer = makeTimer({ status: "running", remainingSeconds: 1100 });
    render(<MatchTimer timer={timer} />);
    fireEvent.click(screen.getByLabelText(/Timer resetten/));
    expect(timer.reset).toHaveBeenCalledTimes(1);
  });

  it("clicking digits while idle swaps to an input", () => {
    const timer = makeTimer();
    render(<MatchTimer timer={timer} />);
    fireEvent.click(screen.getByLabelText(/Timerduur bewerken/));
    expect(screen.getByLabelText("Timerduur in minuten")).toBeInTheDocument();
  });

  it("input commits editMinutes on Enter", () => {
    const timer = makeTimer();
    render(<MatchTimer timer={timer} />);
    fireEvent.click(screen.getByLabelText(/Timerduur bewerken/));
    const input = screen.getByLabelText("Timerduur in minuten") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "15" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(timer.editMinutes).toHaveBeenCalledWith(15);
  });

  it("input cancels edit on Escape without calling editMinutes", () => {
    const timer = makeTimer();
    render(<MatchTimer timer={timer} />);
    fireEvent.click(screen.getByLabelText(/Timerduur bewerken/));
    const input = screen.getByLabelText("Timerduur in minuten");
    fireEvent.change(input, { target: { value: "15" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(timer.editMinutes).not.toHaveBeenCalled();
  });

  it("clicking digits while running does NOT open input", () => {
    const timer = makeTimer({ status: "running", remainingSeconds: 1100 });
    render(<MatchTimer timer={timer} />);
    const digits = screen.getByLabelText(/Resterende tijd/);
    fireEvent.click(digits);
    expect(screen.queryByLabelText("Timerduur in minuten")).toBeNull();
  });
});
