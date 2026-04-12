import { describe, it, expect } from "vitest";
import { formatTime, getBreakMinutesBefore } from "../../engine/time";
import type { ScheduleBreak } from "../../types";

describe("getBreakMinutesBefore", () => {
  it("returns 0 when no breaks exist", () => {
    expect(getBreakMinutesBefore(5, [])).toBe(0);
  });

  it("returns 0 for slots at or before the break", () => {
    const breaks: ScheduleBreak[] = [
      { id: "b1", afterTimeSlot: 3, durationMinutes: 10 },
    ];
    expect(getBreakMinutesBefore(3, breaks)).toBe(0);
    expect(getBreakMinutesBefore(2, breaks)).toBe(0);
  });

  it("returns break duration for slots after the break", () => {
    const breaks: ScheduleBreak[] = [
      { id: "b1", afterTimeSlot: 3, durationMinutes: 10 },
    ];
    expect(getBreakMinutesBefore(4, breaks)).toBe(10);
    expect(getBreakMinutesBefore(10, breaks)).toBe(10);
  });

  it("sums multiple breaks", () => {
    const breaks: ScheduleBreak[] = [
      { id: "b1", afterTimeSlot: 2, durationMinutes: 10 },
      { id: "b2", afterTimeSlot: 5, durationMinutes: 15 },
    ];
    expect(getBreakMinutesBefore(3, breaks)).toBe(10);
    expect(getBreakMinutesBefore(6, breaks)).toBe(25);
  });
});

describe("formatTime", () => {
  it("formats time without breaks", () => {
    expect(formatTime(0, "09:00", 20, [])).toBe("09:00");
    expect(formatTime(3, "09:00", 20, [])).toBe("10:00");
  });

  it("offsets time after a break", () => {
    const breaks: ScheduleBreak[] = [
      { id: "b1", afterTimeSlot: 2, durationMinutes: 10 },
    ];
    expect(formatTime(2, "09:00", 20, breaks)).toBe("09:40");
    expect(formatTime(3, "09:00", 20, breaks)).toBe("10:10");
  });

  it("handles multiple breaks", () => {
    const breaks: ScheduleBreak[] = [
      { id: "b1", afterTimeSlot: 1, durationMinutes: 10 },
      { id: "b2", afterTimeSlot: 3, durationMinutes: 15 },
    ];
    expect(formatTime(0, "09:00", 20, breaks)).toBe("09:00");
    expect(formatTime(2, "09:00", 20, breaks)).toBe("09:50");
    expect(formatTime(4, "09:00", 20, breaks)).toBe("10:45");
  });
});
