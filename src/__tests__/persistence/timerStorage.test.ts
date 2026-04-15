import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  loadTimerState,
  saveTimerState,
  clearTimerState,
  type TimerState,
} from "../../persistence/timerStorage";

const KEY = "ft:timer:v1";

describe("timerStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("returns null when nothing is stored", () => {
    expect(loadTimerState()).toBeNull();
  });

  it("round-trips idle state", () => {
    const state: TimerState = {
      status: "idle",
      durationSeconds: 1200,
      customDuration: false,
    };
    saveTimerState(state);
    expect(loadTimerState()).toEqual(state);
  });

  it("round-trips running state", () => {
    const state: TimerState = {
      status: "running",
      durationSeconds: 1200,
      startedAt: 1_700_000_000_000,
    };
    saveTimerState(state);
    expect(loadTimerState()).toEqual(state);
  });

  it("round-trips paused state", () => {
    const state: TimerState = {
      status: "paused",
      durationSeconds: 1200,
      remainingSeconds: 600,
    };
    saveTimerState(state);
    expect(loadTimerState()).toEqual(state);
  });

  it("round-trips expired state", () => {
    const state: TimerState = {
      status: "expired",
      durationSeconds: 1200,
    };
    saveTimerState(state);
    expect(loadTimerState()).toEqual(state);
  });

  it("returns null for malformed JSON", () => {
    localStorage.setItem(KEY, "{not json");
    expect(loadTimerState()).toBeNull();
  });

  it("returns null when status is unknown", () => {
    localStorage.setItem(KEY, JSON.stringify({ status: "bogus", durationSeconds: 10 }));
    expect(loadTimerState()).toBeNull();
  });

  it("returns null when durationSeconds is missing", () => {
    localStorage.setItem(KEY, JSON.stringify({ status: "idle", customDuration: false }));
    expect(loadTimerState()).toBeNull();
  });

  it("returns null when running state is missing startedAt", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ status: "running", durationSeconds: 60 })
    );
    expect(loadTimerState()).toBeNull();
  });

  it("returns null when paused state is missing remainingSeconds", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ status: "paused", durationSeconds: 60 })
    );
    expect(loadTimerState()).toBeNull();
  });

  it("returns null when durationSeconds is NaN-like", () => {
    // JSON serialises NaN as the literal "null", which is not a valid number
    localStorage.setItem(
      KEY,
      JSON.stringify({ status: "idle", durationSeconds: null, customDuration: false })
    );
    expect(loadTimerState()).toBeNull();
  });

  it("clearTimerState removes the key", () => {
    saveTimerState({ status: "idle", durationSeconds: 60, customDuration: false });
    clearTimerState();
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});
