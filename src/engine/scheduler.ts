import type { Match } from "../types";
import { circleMethodRounds } from "./roundRobin";

type GroupPlan = {
  /** Rounds of pending matches; each round is pair-disjoint on team IDs. */
  rounds: Match[][];
  /** Index of the currently active round. */
  active: number;
};

/**
 * Infer groups from the match list by connected components on team IDs:
 * two matches belong to the same group iff their team-ID sets are transitively
 * linked by any shared team. Returns teams and matches bucketed per component.
 */
function splitIntoComponents(matches: Match[]): {
  teamIds: string[];
  matches: Match[];
}[] {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const p = parent.get(x);
    if (p === undefined || p === x) {
      parent.set(x, x);
      return x;
    }
    const root = find(p);
    parent.set(x, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const m of matches) {
    find(m.homeTeamId);
    find(m.awayTeamId);
    union(m.homeTeamId, m.awayTeamId);
  }

  const byRoot = new Map<string, { teams: Set<string>; matches: Match[] }>();
  for (const m of matches) {
    const root = find(m.homeTeamId);
    let bucket = byRoot.get(root);
    if (!bucket) {
      bucket = { teams: new Set(), matches: [] };
      byRoot.set(root, bucket);
    }
    bucket.teams.add(m.homeTeamId);
    bucket.teams.add(m.awayTeamId);
    bucket.matches.push(m);
  }

  return [...byRoot.values()].map((b) => ({
    teamIds: [...b.teams].sort(),
    matches: b.matches,
  }));
}

/**
 * Decompose one group's matches into rounds.
 *
 * For complete K_n inputs (round-robin groups), the circle method produces
 * pair-disjoint rounds, which the scheduler can pack across groups without
 * any conflict checks.
 *
 * For partial graphs (e.g. a star topology, or any subset of the full pair
 * set), there is no balanced decomposition we can rely on — we hand the
 * scheduler a single bucket with every match and let its per-slot conflict
 * check pack them greedily.
 */
function planGroup(teamIds: string[], matches: Match[]): GroupPlan {
  const n = teamIds.length;
  const expected = (n * (n - 1)) / 2;
  const isCompleteRoundRobin = n >= 2 && matches.length === expected;

  if (!isCompleteRoundRobin) {
    return { rounds: [matches.slice()], active: 0 };
  }

  const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const byPair = new Map<string, Match>();
  for (const m of matches) byPair.set(pairKey(m.homeTeamId, m.awayTeamId), m);

  const indexRounds = circleMethodRounds(n);
  const rounds: Match[][] = [];
  for (const round of indexRounds) {
    const bucket: Match[] = [];
    for (const [i, j] of round) {
      const key = pairKey(teamIds[i], teamIds[j]);
      const match = byPair.get(key);
      if (match) bucket.push(match);
    }
    if (bucket.length > 0) rounds.push(bucket);
  }

  return { rounds, active: 0 };
}

export function scheduleMatches(matches: Match[], fieldCount: number): Match[] {
  if (matches.length === 0) return [];

  // Clone so we never mutate the caller's match objects.
  const cloned = matches.map((m) => ({ ...m }));
  const components = splitIntoComponents(cloned);
  const plans = components.map((c) => planGroup(c.teamIds, c.matches));

  const scheduled: Match[] = [];
  const teamLastSlot = new Map<string, number>();
  let timeSlot = 0;

  while (plans.some((p) => p.active < p.rounds.length)) {
    // Advance any group whose active round is exhausted.
    for (const plan of plans) {
      while (
        plan.active < plan.rounds.length &&
        plan.rounds[plan.active].length === 0
      ) {
        plan.active++;
      }
    }

    // Candidates = union of active-round matches across all groups.
    // For complete-K_n groups, rounds are pair-disjoint by construction; for
    // partial graphs the round is a single bucket, so we still need a per-slot
    // team-conflict check below.
    type Candidate = {
      match: Match;
      plan: GroupPlan;
      minGap: number;
      planRemaining: number;
    };
    const candidates: Candidate[] = [];
    for (const plan of plans) {
      if (plan.active >= plan.rounds.length) continue;
      let planRemaining = 0;
      for (let i = plan.active; i < plan.rounds.length; i++) {
        planRemaining += plan.rounds[i].length;
      }
      for (const match of plan.rounds[plan.active]) {
        const homeLast = teamLastSlot.get(match.homeTeamId) ?? -Infinity;
        const awayLast = teamLastSlot.get(match.awayTeamId) ?? -Infinity;
        const minGap = Math.min(timeSlot - homeLast, timeSlot - awayLast);
        candidates.push({ match, plan, minGap, planRemaining });
      }
    }

    if (candidates.length === 0) break;

    // Critical-path first: plans with more matches left dominate, so the
    // longest competition never idles while a shorter one hogs fields.
    // Within a tie, prefer teams that have rested longer.
    candidates.sort((a, b) => {
      if (a.planRemaining !== b.planRemaining) {
        return b.planRemaining - a.planRemaining;
      }
      return b.minGap - a.minGap;
    });

    const slotTeams = new Set<string>();
    let fieldsUsed = 0;
    for (const c of candidates) {
      if (fieldsUsed >= fieldCount) break;
      if (
        slotTeams.has(c.match.homeTeamId) ||
        slotTeams.has(c.match.awayTeamId)
      ) {
        continue;
      }
      c.match.fieldIndex = fieldsUsed;
      c.match.timeSlot = timeSlot;
      slotTeams.add(c.match.homeTeamId);
      slotTeams.add(c.match.awayTeamId);
      teamLastSlot.set(c.match.homeTeamId, timeSlot);
      teamLastSlot.set(c.match.awayTeamId, timeSlot);
      scheduled.push(c.match);
      // Remove from its round.
      const round = c.plan.rounds[c.plan.active];
      const idx = round.indexOf(c.match);
      if (idx >= 0) round.splice(idx, 1);
      fieldsUsed++;
    }

    if (fieldsUsed === 0) break; // defensive — should not happen
    timeSlot++;
  }

  return scheduled;
}
