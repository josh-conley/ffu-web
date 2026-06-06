import type { Tier } from '@/config'
import type { TitleWin } from '@/selectors'
import { LEAGUE_STYLES } from './leagues'

const TIER_ORDER: Tier[] = ['PREMIER', 'MASTERS', 'NATIONAL']

const TrophyIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
)

/** Summary like "Premier 2022, 2024 · National 2019" — accessible label for the trophy group. */
const titlesLabel = (titles: TitleWin[]): string =>
  TIER_ORDER.filter((t) => titles.some((x) => x.tier === t))
    .map((t) => `${LEAGUE_STYLES[t].label} ${titles.filter((x) => x.tier === t).map((x) => x.year).join(', ')}`)
    .join(' · ')

/** One trophy per championship, colored by the league it was won in; hover shows the year won. */
export function Trophies({ titles }: { titles: TitleWin[] }) {
  if (titles.length === 0) return null
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5" aria-label={titlesLabel(titles)}>
      {titles.map((t, i) => (
        <span key={i} className={LEAGUE_STYLES[t.tier].text} title={t.year}>
          {TrophyIcon}
        </span>
      ))}
    </span>
  )
}

/** Summary like "Premier ×4 · National ×3" for a set of tiers. */
const tierCountLabel = (tiers: Tier[]): string =>
  TIER_ORDER.filter((t) => tiers.includes(t))
    .map((t) => `${LEAGUE_STYLES[t].label} ×${tiers.filter((x) => x === t).length}`)
    .join(' · ')

/** One small dot per occurrence, colored by tier — a compact "which leagues" breakdown
 *  (e.g. playoff appearances). */
export function TierDots({ tiers }: { tiers: Tier[] }) {
  if (tiers.length === 0) return null
  const label = tierCountLabel(tiers)
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5" aria-label={label} title={label}>
      {tiers.map((tier, i) => (
        <span key={i} className={`size-1.5 rounded-full ${LEAGUE_STYLES[tier].dot}`} />
      ))}
    </span>
  )
}
