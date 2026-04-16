export type TimerState =
  | { status: "idle";    durationSeconds: number; customDuration: boolean }
  | { status: "running"; durationSeconds: number; startedAt: number }
  | { status: "paused";  durationSeconds: number; remainingSeconds: number }
  | { status: "expired"; durationSeconds: number };

const STORAGE_KEY = "ft:timer:v1";

export function saveTimerState(state: TimerState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota exceeded / privacy mode — silent drop */
  }
}

export function loadTimerState(): TimerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isTimerState(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearTimerState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function isTimerState(v: unknown): v is TimerState {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (typeof o.status !== "string") return false;
  if (!Number.isFinite(o.durationSeconds as number)) return false;
  switch (o.status) {
    case "idle":
      return typeof o.customDuration === "boolean";
    case "running":
      return Number.isFinite(o.startedAt as number);
    case "paused":
      return Number.isFinite(o.remainingSeconds as number);
    case "expired":
      return true;
    default:
      return false;
  }
}
