// Which side of a two-sided bracket each matchup of a round sits on. ONE rule, shared by the draw
// stage (cup/draw/DrawBracket) and the Cup's bracket on the page (WingedBracket), so the bracket
// looks the same on draw night as it does all season.

const range = (from: number, n: number) => Array.from({ length: n }, (_, k) => from + k)

/**
 * Splits a round of `n` matchups, in bracket order, into its left and right wings: the largest
 * power of two halves, top half on the left. Any overflow past it (the Cup's 18 = 16 + 2 opening
 * games, and the 9 = 8 + 1 Round of 18 games they feed) goes at the foot of the LEFT wing, beside
 * its feeders: in a seeded bracket, seed 9 sits in seed 1's half. A lone matchup (the final) is
 * not a wing; it is returned on the left for the caller to put in the middle.
 */
export function bracketWings(n: number): { left: number[]; right: number[] } {
  if (n <= 1) return { left: range(0, n), right: [] }
  let power = 1
  while (power * 2 <= n) power *= 2
  const half = power / 2
  return { left: [...range(0, half), ...range(power, n - power)], right: range(half, half) }
}
