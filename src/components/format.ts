// Small display formatters shared across components (Charter DRY — one home each).

const SUFFIX = ['th', 'st', 'nd', 'rd']

/** English ordinal, e.g. 1 → "1st", 12 → "12th". */
export function ordinal(n: number): string {
  const v = n % 100
  return `${n}${SUFFIX[(v - 20) % 10] ?? SUFFIX[v] ?? SUFFIX[0]}`
}

const DRAFT_DATE = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
const DRAFT_TIME = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })

/**
 * A draft's kickoff, e.g. "Sat, Aug 22 · 8:30 PM EDT". Rendered in the VIEWER's timezone (with the
 * zone named, so a manager in another zone isn't misled) — Sleeper stores the start as epoch ms, and
 * the whole league doesn't share one clock.
 */
export function draftDateTime(startTime: number): string {
  const at = new Date(startTime)
  return `${DRAFT_DATE.format(at)} · ${DRAFT_TIME.format(at)}`
}
