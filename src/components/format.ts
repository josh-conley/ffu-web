// Small display formatters shared across components (Charter DRY — one home each).

const SUFFIX = ['th', 'st', 'nd', 'rd']

/** English ordinal, e.g. 1 → "1st", 12 → "12th". */
export function ordinal(n: number): string {
  const v = n % 100
  return `${n}${SUFFIX[(v - 20) % 10] ?? SUFFIX[v] ?? SUFFIX[0]}`
}

/** Consecutive years collapsed into ranges, e.g. ['2018','2019','2021'] → "2018–2019, 2021".
 *  Input is assumed ascending; a lone year stays a lone year (no "2018–2018"). */
export function yearRanges(years: string[]): string {
  const spans: [string, string][] = []
  for (const year of years) {
    const last = spans.at(-1)
    if (last && Number(year) === Number(last[1]) + 1) last[1] = year
    else spans.push([year, year])
  }
  return spans.map(([from, to]) => (from === to ? from : `${from}–${to}`)).join(', ')
}
