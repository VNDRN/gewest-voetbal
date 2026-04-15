import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useMatchTimer } from "../../hooks/useMatchTimer";

describe("useMatchTimer — core transitions", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T10:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("starts idle with duration from config", () => {
    const { result } = renderHook(() => useMatchTimer(1200));
    expect(result.current.status).toBe("idle");
    expect(result.current.durationSeconds).toBe(1200);
    expect(result.current.remainingSeconds).toBe(1200);
    expect(result.current.customDuration).toBe(false);
    expect(result.current.modalOpen).toBe(false);
  });

  it("start transitions idle -> running", () => {
    const { result } = renderHook(() => useMatchTimer(60));
    act(() => {
      result.current.start();
    });
    expect(result.current.status).toBe("running");
    expect(result.current.remainingSeconds).toBe(60);
  });

  it("pause captures remaining after some time elapses", () => {
    const { result } = renderHook(() => useMatchTimer(60));
    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    act(() => {
      result.current.pause();
    });
    expect(result.current.status).toBe("paused");
    expect(result.current.remainingSeconds).toBe(55);
  });

  it("resume back-dates startedAt so remaining is preserved", () => {
    const { result } = renderHook(() => useMatchTimer(60));
    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    act(() => {
      result.current.pause();
    });
    // While paused, advance more time — should NOT affect remaining
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current.remainingSeconds).toBe(55);
    act(() => {
      result.current.resume();
    });
    expect(result.current.status).toBe("running");
    expect(result.current.remainingSeconds).toBe(55);
  });

  it("pause is a no-op when not running", () => {
    const { result } = renderHook(() => useMatchTimer(60));
    act(() => {
      result.current.pause(); // from idle
    });
    expect(result.current.status).toBe("idle");
  });

  it("resume is a no-op when not paused", () => {
    const { result } = renderHook(() => useMatchTimer(60));
    act(() => {
      result.current.resume(); // from idle
    });
    expect(result.current.status).toBe("idle");
  });
});
