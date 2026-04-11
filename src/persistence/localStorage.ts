import type { Tournament } from "../types";

const STORAGE_KEY = "football-tournament-state";

export function saveState(state: Tournament): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadState(): Tournament | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Tournament;
  } catch {
    return null;
  }
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
