import { useCallback, useEffect, useState } from "react";
import { loadTimerState, saveTimerState, type TimerState } from "../persistence/timerStorage";
import { playTimerBeep } from "../utils/timerBeep";

export type { TimerState };

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
  editDuration: (seconds: number) => void;
  snoozeTwoMinutes: () => void;
  startNextSlot: () => void;
  dismissModal: () => void;
}

// `dismissed` is a UI flag, NOT part of TimerState (which gets persisted).
// Convention: transitions that begin a fresh expiry cycle (tick→expired,
// snooze, startNextSlot, reset) construct a fresh HookState with
// `dismissed: false`. Transitions that don't change the dismissed lifecycle
// (start, pause, resume, editDuration) spread `...s` to preserve it.
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
  const [{ timer: state, dismissed }, setHookState] = useState<HookState>(() => {
    const stored = loadTimerState();
    if (!stored) {
      return { timer: idleFromConfig(configSlotSeconds), dismissed: false };
    }
    if (stored.status === "running") {
      const remaining = stored.durationSeconds - (Date.now() - stored.startedAt) / 1000;
      if (remaining <= 0) {
        return { timer: { status: "expired", durationSeconds: stored.durationSeconds }, dismissed: false };
      }
    }
    return { timer: stored, dismissed: false };
  });
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

  // Persist timer state on every change — `dismissed` is session-only UI state, never stored
  useEffect(() => {
    saveTimerState(state);
  }, [state]);

  useEffect(() => {
    if (state.status === "expired") {
      playTimerBeep();
    }
  }, [state.status]);

  // Sync derived idle duration from config prop — bails out via referential identity when no change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHookState((s) => {
      if (s.timer.status !== "idle") return s;
      if (s.timer.customDuration) return s;
      if (s.timer.durationSeconds === configSlotSeconds) return s;
      return { ...s, timer: { status: "idle", durationSeconds: configSlotSeconds, customDuration: false } };
    });
  }, [configSlotSeconds]);

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

  const editDuration = useCallback((seconds: number) => {
    const clamped = Math.max(1, Math.min(7200, Math.floor(seconds)));
    setHookState((s) => {
      if (s.timer.status !== "idle") return s;
      return { ...s, timer: { status: "idle", durationSeconds: clamped, customDuration: true } };
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
    editDuration,
    snoozeTwoMinutes,
    startNextSlot,
    dismissModal,
  };
}
