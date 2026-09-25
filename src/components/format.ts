// Small display formatters shared across components (Charter DRY — one home each).
import type { PlayerGame } from '@/selectors'

const SUFFIX = ['th', 'st', 'nd', 'rd']

/** English ordinal, e.g. 1 → "1st", 12 → "12th". */
export function ordinal(n: number): string {
  const v = n % 100
  return `${n}${SUFFIX[(v - 20) % 10] ?? SUFFIX[v] ?? SUFFIX[0]}`
}

/** A team's record, e.g. "7-6" or "7-6-1" — ties shown only when there are any. */
export function recordLabel(record: { wins: number; losses: number; ties: number }): string {
  const { wins, losses, ties } = record
  return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`
}

/**
 * A player's name with the first name reduced to an initial: "Christian McCaffrey" → "C. McCaffrey".
 * For narrow screens, where a box score has two names side by side and the full pair doesn't fit —
 * an initial keeps the part that identifies the player instead of truncating mid-surname. Anything
 * without a space (a team defense, a mononym) is left exactly as it is.
 */
export function shortPlayerName(name: string): string {
  const [first, ...rest] = name.trim().split(/\s+/)
  if (rest.length === 0 || !first) return name
  return `${first[0]}. ${rest.join(' ')}`
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

const KICKOFF = new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })

/** Where a live game is: "Q3 7:30", "Half", "OT 4:12" — or just "Live" before a quarter is reported. */
function gamePeriod({ quarter, clock }: Pick<PlayerGame, 'quarter' | 'clock'>): string {
  if (quarter === undefined) return 'Live'
  const time = clock?.replace(/^0(?=\d:)/, '') // "07:30" -> "7:30"
  if (quarter === 2 && time === '0:00') return 'Half'
  const period = quarter > 4 ? 'OT' : `Q${quarter}`
  return time ? `${period} ${time}` : period
}

/**
 * A live box score's note on a player's NFL game: "Mon 8:15 PM vs PHI" before kickoff (in the
 * VIEWER's timezone, like draftDateTime, but unnamed for space), "Q3 7:30 @ BUF" while it's on, and
 * "Final @ BUF" once it's over — the opponent still answers "who did he play?". The same text on
 * every screen size; only where it sits changes.
 */
export function gameNote(game: PlayerGame): string {
  if (game.status === 'final') return `Final ${game.opponent}`
  const when = game.status === 'live' ? gamePeriod(game) : game.kickoff !== undefined ? KICKOFF.format(new Date(game.kickoff)).replace(',', '') : undefined
  return when ? `${when} ${game.opponent}` : game.opponent
}
