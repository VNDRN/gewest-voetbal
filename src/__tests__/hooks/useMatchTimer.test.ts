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

describe("useMatchTimer — tick + expiry", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T10:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("remainingSeconds decreases while running", () => {
    const { result } = renderHook(() => useMatchTimer(60));
    act(() => {
      result.current.start();
    });
    expect(result.current.remainingSeconds).toBe(60);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.remainingSeconds).toBe(50);
  });

  it("transitions to expired when remaining crosses zero", () => {
    const { result } = renderHook(() => useMatchTimer(5));
    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(result.current.status).toBe("expired");
    expect(result.current.remainingSeconds).toBe(0);
  });

  it("modalOpen is true once expired and not dismissed", () => {
    const { result } = renderHook(() => useMatchTimer(2));
    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.status).toBe("expired");
    expect(result.current.modalOpen).toBe(true);
  });
});
