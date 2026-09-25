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

/** "Sun 1p", "Thu 8:15p" — a kickoff squeezed for a phone. A 24-hour locale keeps its own "Sun 13:00". */
function shortKickoff(at: Date): string {
  const parts = KICKOFF.formatToParts(at)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''
  const period = part('dayPeriod')
  if (!period) return `${part('weekday')} ${part('hour')}:${part('minute')}`
  const minute = part('minute') === '00' ? '' : `:${part('minute')}`
  return `${part('weekday')} ${part('hour')}${minute}${period[0]?.toLowerCase() ?? ''}`
}

/** Where a live game is: "Q3 7:30", "Half", "OT 4:12" — or just "Live" before a quarter is reported. */
function gamePeriod({ quarter, clock }: Pick<PlayerGame, 'quarter' | 'clock'>): string {
  if (quarter === undefined) return 'Live'
  const time = clock?.replace(/^0(?=\d:)/, '') // "07:30" -> "7:30"
  if (quarter === 2 && time === '0:00') return 'Half'
  const period = quarter > 4 ? 'OT' : `Q${quarter}`
  return time ? `${period} ${time}` : period
}

/** A player's game, in the two widths a box score has room for (see gameNote). */
export interface GameNote {
  /** From `sm` up, after the name and NFL team: "@MIA · Sun 1:00 PM", "vs NO · Q3 7:30". */
  full: string
  /** On a phone, on a second line under the name: "Sun 1p", "Q3 7:30" — no opponent, for room. */
  short: string
}

/**
 * A live box score's inline note on a player's NFL game: the kickoff (in the VIEWER's timezone,
 * like draftDateTime, but unnamed for space) before it starts, the clock while it's on, and nothing
 * once it's over.
 */
export function gameNote(game: PlayerGame): GameNote | undefined {
  if (game.status === 'final') return undefined
  if (game.status === 'live') {
    const period = gamePeriod(game)
    return { full: `${game.opponent} · ${period}`, short: period }
  }
  if (game.kickoff === undefined) return { full: game.opponent, short: game.opponent }
  const at = new Date(game.kickoff)
  return { full: `${game.opponent} · ${KICKOFF.format(at)}`, short: shortKickoff(at) }
}
