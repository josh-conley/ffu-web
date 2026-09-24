import { useUpdateUrlParams, useUrlState } from './useUrlState'

export interface YearRangeState {
  fromYear: string
  toYear: string
  setFrom: (year: string) => void
  setTo: (year: string) => void
  /** True when the range covers every year, i.e. it isn't filtering anything. */
  isFull: boolean
  reset: () => void
}

/**
 * A span of seasons kept in the URL as `?from=&to=`, defaulting to every year in `years`
 * (ascending). A param naming a year that isn't in `years` falls back to that end of the full span
 * rather than filtering everything out.
 */
export function useYearRange(years: string[]): YearRangeState {
  const [fromParam, setFrom] = useUrlState('from', '')
  const [toParam, setTo] = useUrlState('to', '')
  const update = useUpdateUrlParams()
  const first = years[0] ?? ''
  const last = years.at(-1) ?? ''
  const fromYear = years.includes(fromParam) ? fromParam : first
  const toYear = years.includes(toParam) ? toParam : last
  return {
    fromYear,
    toYear,
    setFrom,
    setTo,
    isFull: fromYear === first && toYear === last,
    reset: () => update({ from: null, to: null }),
  }
}
