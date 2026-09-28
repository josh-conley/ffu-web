import { getMember, nameForYear } from '@/config'
import type { H2HMeeting, SeriesPreview, SeriesStanding } from '@/selectors'

/** A team's short tag ("STA"), for lines too narrow for the full name. */
export const teamAbbr = (ffuId: string) => getMember(ffuId)?.abbreviation ?? getMember(ffuId)?.name ?? ffuId

/** "5–4", or "4–4–1" when there were ties — leader's wins first. */
export function seriesScore(s: SeriesStanding): string {
  const tail = s.ties > 0 ? `–${s.ties}` : ''
  return `${s.leaderWins}–${s.trailerWins}${tail}`
}

function lastMetText(m: H2HMeeting): string {
  return m.isPlayoff ? `last met in the ${m.year} playoffs` : `last met ${m.year} Wk ${m.week}`
}

/** A matchup card's series line: "STA leads 4–2 · last met in the 2024 playoffs". */
export function seriesLineText({ standing, lastMet }: SeriesPreview): string {
  const lead = standing.leaderId ? `${teamAbbr(standing.leaderId)} leads ${seriesScore(standing)}` : `Series tied ${seriesScore(standing)}`
  return `${lead} · ${lastMetText(lastMet)}`
}

/**
 * What a live or upcoming card's series line says, so every card carries exactly one line and a
 * row of cards stays the same height: the series, "First meeting", or nothing yet while the
 * seasons load (the card still reserves the line).
 */
export function seriesLineFor(preview: SeriesPreview | null | undefined): string | undefined {
  if (preview === undefined) return undefined
  return preview ? seriesLineText(preview) : 'First meeting'
}

/** The accessible name of a card that opens a game's lineups: "Stallions vs Johnkshire Cats, view lineups". */
export function lineupsLabel(memberIds: readonly string[], year: string): string {
  return `${memberIds.map((id) => nameForYear(id, year) ?? id).join(' vs ')}, view lineups`
}
