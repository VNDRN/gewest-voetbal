import { useCallback, useEffect, useState } from "react";
import type { TimerState } from "../persistence/timerStorage";

export type { TimerState } from "../persistence/timerStorage";

export interface UseMatchTimerResult {
  status: TimerState["status"];
  durationSeconds: number;
  remainingSeconds: number;
  customDuration: boolean;
  modalOpen: boolean;

  start: () => void;
  pause: () => void;
  resume: () => void;
}

function idleFromConfig(configSlotSeconds: number): TimerState {
  return { status: "idle", durationSeconds: configSlotSeconds, customDuration: false };
}

function computeRemaining(state: TimerState, now: number): number {
  switch (state.status) {
    case "idle":
      return state.durationSeconds;
    case "running":
      return Math.max(0, Math.ceil(state.durationSeconds - (now - state.startedAt) / 1000));
    case "paused":
      return state.remainingSeconds;
    case "expired":
      return 0;
  }
}

export function useMatchTimer(configSlotSeconds: number): UseMatchTimerResult {
  const [state, setState] = useState<TimerState>(() => idleFromConfig(configSlotSeconds));
  const [now, setNow] = useState(() => Date.now());

  // Ticking — interval runs only while running
  useEffect(() => {
    if (state.status !== "running") return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [state.status]);

  const start = useCallback(() => {
    const ts = Date.now();
    setState((s) => {
      if (s.status !== "idle") return s;
      return { status: "running", durationSeconds: s.durationSeconds, startedAt: ts };
    });
    setNow(ts);
  }, []);

  const pause = useCallback(() => {
    setState((s) => {
      if (s.status !== "running") return s;
      const remaining = Math.max(0, Math.ceil(s.durationSeconds - (Date.now() - s.startedAt) / 1000));
      return { status: "paused", durationSeconds: s.durationSeconds, remainingSeconds: remaining };
    });
  }, []);

  const resume = useCallback(() => {
    const ts = Date.now();
    setState((s) => {
      if (s.status !== "paused") return s;
      const startedAt = ts - (s.durationSeconds - s.remainingSeconds) * 1000;
      return { status: "running", durationSeconds: s.durationSeconds, startedAt };
    });
    setNow(ts);
  }, []);

  const remainingSeconds = computeRemaining(state, now);
  const customDuration = state.status === "idle" ? state.customDuration : false;

  return {
    status: state.status,
    durationSeconds: state.durationSeconds,
    remainingSeconds,
    customDuration,
    modalOpen: false, // filled in by later task
    start,
    pause,
    resume,
  };
}
