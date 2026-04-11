import type { GroupOption, Match } from "../types";

function nextPowerOf2(n: number): number {
  if (n <= 1) return 1;
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export function getGroupOptions(teamCount: number): GroupOption[] {
  if (teamCount < 6) return [];

  const MIN_SIZE = 3;
  const MAX_SIZE = 5;
  const MIN_GROUPS = 2;
  const options: GroupOption[] = [];
  const seen = new Set<string>();

  const maxGroups = Math.floor(teamCount / MIN_SIZE);

  for (let numGroups = MIN_GROUPS; numGroups <= maxGroups; numGroups++) {
    const baseSize = Math.floor(teamCount / numGroups);
    const remainder = teamCount % numGroups;

    if (baseSize < MIN_SIZE || baseSize > MAX_SIZE) continue;
    if (remainder > 0 && baseSize + 1 > MAX_SIZE) continue;

    const sizes: number[] = [];
    for (let i = 0; i < remainder; i++) sizes.push(baseSize + 1);
    for (let i = remainder; i < numGroups; i++) sizes.push(baseSize);

    const key = sizes.join(",");
    if (seen.has(key)) continue;
    seen.add(key);

    const sizeCounts = new Map<number, number>();
    for (const s of sizes) sizeCounts.set(s, (sizeCounts.get(s) ?? 0) + 1);

    const labelParts = [...sizeCounts.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([size, count]) => `${count}x${size}`);

    options.push({
      groupCount: numGroups,
      sizes,
      label: labelParts.join(" + "),
    });
  }

  return options;
}

export function generateRoundRobinMatches(
  teamIds: string[],
  groupId: string
): Match[] {
  const matches: Match[] = [];

  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      matches.push({
        id: `${groupId}-m${i}-${j}`,
        homeTeamId: teamIds[i],
        awayTeamId: teamIds[j],
        fieldIndex: -1,
        timeSlot: -1,
        score: null,
        phase: "group",
      });
    }
  }

  return matches;
}

export function calculateBracketFill(
  groupCount: number,
  advancingPerGroup: number
): { knockoutSize: number; bestNextPlacedCount: number } {
  if (groupCount < 1 || advancingPerGroup < 1) {
    return { knockoutSize: 0, bestNextPlacedCount: 0 };
  }

  const directQualifiers = groupCount * advancingPerGroup;
  let knockoutSize = nextPowerOf2(directQualifiers);
  let bestNextPlacedCount = knockoutSize - directQualifiers;

  if (bestNextPlacedCount > groupCount) {
    knockoutSize = nextPowerOf2(directQualifiers + groupCount);
    bestNextPlacedCount = knockoutSize - directQualifiers;
    if (bestNextPlacedCount > groupCount) {
      bestNextPlacedCount = groupCount;
    }
  }

  return { knockoutSize, bestNextPlacedCount };
}
