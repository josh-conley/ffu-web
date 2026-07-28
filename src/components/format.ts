// Small display formatters shared across components (Charter DRY — one home each).

const SUFFIX = ['th', 'st', 'nd', 'rd']

/** English ordinal, e.g. 1 → "1st", 12 → "12th". */
export function ordinal(n: number): string {
  const v = n % 100
  return `${n}${SUFFIX[(v - 20) % 10] ?? SUFFIX[v] ?? SUFFIX[0]}`
}
