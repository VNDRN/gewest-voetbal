import type { Change } from "./scheduleMove";
import type { ScheduledMatch } from "../types";

export type Mover = { key: string };

export function computeMovers(
  change: Change,
  matches: ScheduledMatch[]
): Mover[] {
  switch (change.kind) {
    case "move":
      return [];
    case "swap":
      return [{ key: `${change.matchBCompetitionId}:${change.matchBId}` }];
    case "insert": {
      const isMoving = (m: ScheduledMatch) =>
        m.id === change.matchId &&
        (change.competitionId == null || m.competitionId === change.competitionId);
      return matches
        .filter((m) => m.timeSlot >= change.atSlot && !isMoving(m))
        .map((m) => ({ key: `${m.competitionId}:${m.id}` }));
    }
  }
}

export function applyFlip(
  movers: Mover[],
  oldRects: Map<string, DOMRect>,
  refs: Map<string, HTMLElement>,
  duration: number,
  easing: string
): void {
  for (const { key } of movers) {
    const oldRect = oldRects.get(key);
    const el = refs.get(key);
    if (!oldRect || !el) continue;

    const newRect = el.getBoundingClientRect();
    const dx = oldRect.left - newRect.left;
    const dy = oldRect.top - newRect.top;
    if (Math.abs(dx) <= 0.5 && Math.abs(dy) <= 0.5) continue;

    el.style.transition = "none";
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    void el.offsetHeight;

    requestAnimationFrame(() => {
      el.style.transition = `transform ${duration}ms ${easing}`;
      el.style.transform = "";
      const onEnd = () => {
        el.style.transition = "";
        el.style.transform = "";
        el.removeEventListener("transitionend", onEnd);
      };
      el.addEventListener("transitionend", onEnd);
    });
  }
}
