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

describe("useMatchTimer — reset, edit, snooze, next-slot, dismiss", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T10:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("reset from running returns to idle with config duration", () => {
    const { result } = renderHook(() => useMatchTimer(1200));
    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.status).toBe("idle");
    expect(result.current.durationSeconds).toBe(1200);
    expect(result.current.customDuration).toBe(false);
  });

  it("editDuration updates duration in seconds and marks custom when idle", () => {
    const { result } = renderHook(() => useMatchTimer(1200));
    act(() => {
      result.current.editDuration(150);
    });
    expect(result.current.durationSeconds).toBe(150);
    expect(result.current.customDuration).toBe(true);
    expect(result.current.remainingSeconds).toBe(150);
  });

  it("editDuration clamps to [1, 7200]", () => {
    const { result } = renderHook(() => useMatchTimer(1200));
    act(() => {
      result.current.editDuration(0);
    });
    expect(result.current.durationSeconds).toBe(1);
    act(() => {
      result.current.editDuration(9999);
    });
    expect(result.current.durationSeconds).toBe(7200);
  });

  it("editDuration is a no-op while running", () => {
    const { result } = renderHook(() => useMatchTimer(1200));
    act(() => {
      result.current.start();
    });
    act(() => {
      result.current.editDuration(300);
    });
    expect(result.current.status).toBe("running");
    expect(result.current.durationSeconds).toBe(1200);
  });

  it("editDuration is a no-op while paused", () => {
    const { result } = renderHook(() => useMatchTimer(1200));
    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    act(() => {
      result.current.pause();
    });
    act(() => {
      result.current.editDuration(300);
    });
    expect(result.current.status).toBe("paused");
    expect(result.current.durationSeconds).toBe(1200);
  });

  it("snoozeTwoMinutes from expired: durationSeconds unchanged, remaining = 120", () => {
    const { result } = renderHook(() => useMatchTimer(900));
    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(901_000);
    });
    expect(result.current.status).toBe("expired");
    act(() => {
      result.current.snoozeTwoMinutes();
    });
    expect(result.current.status).toBe("running");
    expect(result.current.durationSeconds).toBe(900);
    expect(result.current.remainingSeconds).toBe(120);
  });

  it("startNextSlot from expired starts a fresh run at durationSeconds", () => {
    const { result } = renderHook(() => useMatchTimer(300));
    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(301_000);
    });
    act(() => {
      result.current.startNextSlot();
    });
    expect(result.current.status).toBe("running");
    expect(result.current.remainingSeconds).toBe(300);
  });

  it("after snooze + second expiry, startNextSlot uses original durationSeconds (not 120)", () => {
    const { result } = renderHook(() => useMatchTimer(900));
    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(901_000);
    });
    act(() => {
      result.current.snoozeTwoMinutes();
    });
    act(() => {
      vi.advanceTimersByTime(121_000);
    });
    expect(result.current.status).toBe("expired");
    act(() => {
      result.current.startNextSlot();
    });
    expect(result.current.remainingSeconds).toBe(900);
  });

  it("dismissModal closes modal but keeps state expired", () => {
    const { result } = renderHook(() => useMatchTimer(2));
    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.modalOpen).toBe(true);
    act(() => {
      result.current.dismissModal();
    });
    expect(result.current.status).toBe("expired");
    expect(result.current.modalOpen).toBe(false);
  });

  it("re-entering expired reopens the modal (second cycle)", () => {
    const { result } = renderHook(() => useMatchTimer(2));
    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    act(() => {
      result.current.dismissModal();
    });
    expect(result.current.modalOpen).toBe(false);
    act(() => {
      result.current.startNextSlot();
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.modalOpen).toBe(true);
  });
});

describe("useMatchTimer — persistence and config sync", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T10:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("persists state to localStorage on every change", () => {
    const { result } = renderHook(() => useMatchTimer(60));
    act(() => {
      result.current.start();
    });
    const raw = localStorage.getItem("ft:timer:v1");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.status).toBe("running");
    expect(parsed.durationSeconds).toBe(60);
    expect(typeof parsed.startedAt).toBe("number");
  });

  it("rehydrates running state from localStorage on mount", () => {
    const startedAt = Date.now() - 10_000; // 10s elapsed
    localStorage.setItem(
      "ft:timer:v1",
      JSON.stringify({ status: "running", durationSeconds: 60, startedAt })
    );
    const { result } = renderHook(() => useMatchTimer(60));
    expect(result.current.status).toBe("running");
    expect(result.current.remainingSeconds).toBe(50);
  });

  it("rehydrates to expired when stored running is already past duration", () => {
    const startedAt = Date.now() - 120_000; // 2 minutes ago
    localStorage.setItem(
      "ft:timer:v1",
      JSON.stringify({ status: "running", durationSeconds: 60, startedAt })
    );
    const { result } = renderHook(() => useMatchTimer(60));
    expect(result.current.status).toBe("expired");
    expect(result.current.modalOpen).toBe(true);
  });

  it("syncs idle duration with configSlotSeconds when not custom", () => {
    const { result, rerender } = renderHook(
      ({ cfg }) => useMatchTimer(cfg),
      { initialProps: { cfg: 1200 } }
    );
    expect(result.current.durationSeconds).toBe(1200);
    rerender({ cfg: 600 });
    expect(result.current.durationSeconds).toBe(600);
  });

  it("does NOT sync when idle duration is user-customized", () => {
    const { result, rerender } = renderHook(
      ({ cfg }) => useMatchTimer(cfg),
      { initialProps: { cfg: 1200 } }
    );
    act(() => {
      result.current.editDuration(900); // customDuration = true
    });
    rerender({ cfg: 600 });
    expect(result.current.durationSeconds).toBe(900);
    expect(result.current.customDuration).toBe(true);
  });

  it("does NOT sync when running", () => {
    const { result, rerender } = renderHook(
      ({ cfg }) => useMatchTimer(cfg),
      { initialProps: { cfg: 1200 } }
    );
    act(() => {
      result.current.start();
    });
    rerender({ cfg: 600 });
    expect(result.current.durationSeconds).toBe(1200);
    expect(result.current.status).toBe("running");
  });

  it("reset clears customDuration and re-syncs to current config", () => {
    const { result } = renderHook(() => useMatchTimer(1200));
    act(() => {
      result.current.editDuration(900);
    });
    expect(result.current.customDuration).toBe(true);
    act(() => {
      result.current.reset();
    });
    expect(result.current.customDuration).toBe(false);
    expect(result.current.durationSeconds).toBe(1200);
  });
});
