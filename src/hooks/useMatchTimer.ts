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
  reset: () => void;
  editMinutes: (minutes: number) => void;
  snoozeTwoMinutes: () => void;
  startNextSlot: () => void;
  dismissModal: () => void;
}

// `dismissed` is a UI flag, NOT part of TimerState (which gets persisted).
// Convention: transitions that begin a fresh expiry cycle (tick→expired,
// snooze, startNextSlot, reset) construct a fresh HookState with
// `dismissed: false`. Transitions that don't change the dismissed lifecycle
// (start, pause, resume, editMinutes) spread `...s` to preserve it.
type HookState = { timer: TimerState; dismissed: boolean };

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
  const [{ timer: state, dismissed }, setHookState] = useState<HookState>(() => ({
    timer: idleFromConfig(configSlotSeconds),
    dismissed: false,
  }));
  const [now, setNow] = useState(() => Date.now());

  // Ticking + expiry — interval runs only while running; transitions to expired when remaining hits zero
  useEffect(() => {
    if (state.status !== "running") return;
    const id = setInterval(() => {
      const ts = Date.now();
      setNow(ts);
      setHookState((s) => {
        if (s.timer.status !== "running") return s;
        const remaining = computeRemaining(s.timer, Date.now());
        if (remaining <= 0) {
          return { timer: { status: "expired", durationSeconds: s.timer.durationSeconds }, dismissed: false };
        }
        return s;
      });
    }, 250);
    return () => clearInterval(id);
  }, [state.status]);

  const start = useCallback(() => {
    const ts = Date.now();
    setHookState((s) => {
      if (s.timer.status !== "idle") return s;
      return { ...s, timer: { status: "running", durationSeconds: s.timer.durationSeconds, startedAt: ts } };
    });
    setNow(ts);
  }, []);

  const pause = useCallback(() => {
    setHookState((s) => {
      if (s.timer.status !== "running") return s;
      const remaining = Math.max(0, Math.ceil(s.timer.durationSeconds - (Date.now() - s.timer.startedAt) / 1000));
      return { ...s, timer: { status: "paused", durationSeconds: s.timer.durationSeconds, remainingSeconds: remaining } };
    });
  }, []);

  const resume = useCallback(() => {
    const ts = Date.now();
    setHookState((s) => {
      if (s.timer.status !== "paused") return s;
      const startedAt = ts - (s.timer.durationSeconds - s.timer.remainingSeconds) * 1000;
      return { ...s, timer: { status: "running", durationSeconds: s.timer.durationSeconds, startedAt } };
    });
    setNow(ts);
  }, []);

  const reset = useCallback(() => {
    setHookState({ timer: { status: "idle", durationSeconds: configSlotSeconds, customDuration: false }, dismissed: false });
  }, [configSlotSeconds]);

  const editMinutes = useCallback((minutes: number) => {
    const clamped = Math.max(1, Math.min(120, Math.floor(minutes)));
    setHookState((s) => {
      if (s.timer.status !== "idle") return s;
      return { ...s, timer: { status: "idle", durationSeconds: clamped * 60, customDuration: true } };
    });
  }, []);

  const snoozeTwoMinutes = useCallback(() => {
    const ts = Date.now();
    setHookState((s) => {
      if (s.timer.status !== "expired") return s;
      const snoozeRemaining = Math.min(120, s.timer.durationSeconds);
      const startedAt = ts - (s.timer.durationSeconds - snoozeRemaining) * 1000;
      return { timer: { status: "running", durationSeconds: s.timer.durationSeconds, startedAt }, dismissed: false };
    });
    setNow(ts);
  }, []);

  const startNextSlot = useCallback(() => {
    const ts = Date.now();
    setHookState((s) => {
      if (s.timer.status !== "expired") return s;
      return { timer: { status: "running", durationSeconds: s.timer.durationSeconds, startedAt: ts }, dismissed: false };
    });
    setNow(ts);
  }, []);

  const dismissModal = useCallback(() => {
    setHookState((s) => ({ ...s, dismissed: true }));
  }, []);

  const remainingSeconds = computeRemaining(state, now);
  const customDuration = state.status === "idle" ? state.customDuration : false;

  return {
    status: state.status,
    durationSeconds: state.durationSeconds,
    remainingSeconds,
    customDuration,
    modalOpen: state.status === "expired" && !dismissed,
    start,
    pause,
    resume,
    reset,
    editMinutes,
    snoozeTwoMinutes,
    startNextSlot,
    dismissModal,
  };
}
