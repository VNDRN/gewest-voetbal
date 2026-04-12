import type { Tournament } from "../types";

const STORAGE_KEY = "football-tournament-state";

export function saveState(state: Tournament): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const COMPETITION_NAME_MAP: Record<string, string> = {
  "Men's": "Heren",
  "Women's": "Dames",
};

export function loadState(): Tournament | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const state = JSON.parse(raw) as Tournament;
    state.competitions = state.competitions.map((c) => ({
      ...c,
      name: COMPETITION_NAME_MAP[c.name] ?? c.name,
    })) as Tournament["competitions"];
    return state;
  } catch {
    return null;
  }
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
