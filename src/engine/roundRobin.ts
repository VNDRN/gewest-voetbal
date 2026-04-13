export function circleMethodRounds(teamCount: number): number[][][] {
  if (teamCount < 2) return [];

  const isOdd = teamCount % 2 === 1;
  const n = isOdd ? teamCount + 1 : teamCount;
  const byeTeam = teamCount; // phantom team index (only used when isOdd)

  const numRounds = n - 1;
  const half = n / 2;

  // positions[0] is fixed; positions[1..n-1] rotates each round.
  const positions = Array.from({ length: n }, (_, i) => i);
  const rounds: number[][][] = [];

  for (let r = 0; r < numRounds; r++) {
    const round: number[][] = [];
    for (let k = 0; k < half; k++) {
      const a = positions[k];
      const b = positions[n - 1 - k];
      if (isOdd && (a === byeTeam || b === byeTeam)) continue;
      round.push([a, b]);
    }
    rounds.push(round);

    // Rotate positions[1..n-1] one step clockwise.
    const last = positions[n - 1];
    for (let i = n - 1; i > 1; i--) positions[i] = positions[i - 1];
    positions[1] = last;
  }

  return rounds;
}
