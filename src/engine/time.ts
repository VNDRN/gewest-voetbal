import type { ScheduleBreak } from "../types";

export function getBreakMinutesBefore(
  slot: number,
  breaks: ScheduleBreak[]
): number {
  let total = 0;
  for (const b of breaks) {
    if (b.afterTimeSlot < slot) total += b.durationMinutes;
  }
  return total;
}

export function formatTime(
  slot: number,
  startTime: string,
  slotDuration: number,
  breaks: ScheduleBreak[]
): string {
  const [h, m] = startTime.split(":").map(Number);
  const total =
    h * 60 + m + slot * slotDuration + getBreakMinutesBefore(slot, breaks);
  const hours = Math.floor(total / 60).toString().padStart(2, "0");
  const mins = (total % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}
