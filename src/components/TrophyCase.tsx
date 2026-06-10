import { FaTrophy, FaMedal, FaAward } from 'react-icons/fa6'
import type { CareerStats, SeasonFinish } from '@/selectors'
import { LEAGUE_STYLES, TIER_PRESTIGE } from './leagues'

const HARDWARE = {
  1: { icon: FaTrophy, ordinal: '1st', label: 'Champion' },
  2: { icon: FaMedal, ordinal: '2nd', label: 'Runner-up' },
  3: { icon: FaAward, ordinal: '3rd', label: 'Third place' },
} as const

function isTrophy(f: SeasonFinish): f is SeasonFinish & { finalPlacement: 1 | 2 | 3 } {
  return f.finalPlacement !== null && f.finalPlacement <= 3
}

/** Top-3 finishes as tier-colored tiles — by placement, then tier prestige (a Premier title
 *  outranks a newer Masters one), then newest year. Shared by the modal and Members detail. */
export function TrophyCase({ career }: { career: CareerStats }) {
  const trophies = career.finishes
    .filter(isTrophy)
    .sort(
      (a, b) =>
        a.finalPlacement - b.finalPlacement ||
        TIER_PRESTIGE.indexOf(a.tier) - TIER_PRESTIGE.indexOf(b.tier) ||
        b.year.localeCompare(a.year),
    )
  if (trophies.length === 0) return <p className="text-xs text-muted">None</p>
  return (
    <div className="flex flex-wrap gap-2">
      {trophies.map((f) => {
        const { icon: Icon, ordinal, label } = HARDWARE[f.finalPlacement]
        return (
          <span key={`${f.year}-${f.tier}-${f.finalPlacement}`} title={`${LEAGUE_STYLES[f.tier].label} ${label} · ${f.year}`} className="flex aspect-square w-16 flex-col items-center justify-center gap-1 bg-surface-2 ring-1 ring-border">
            <Icon size={22} className={LEAGUE_STYLES[f.tier].text} aria-hidden />
            <span className="text-xs leading-none">
              <span className={`font-bold ${LEAGUE_STYLES[f.tier].text}`}>{ordinal}</span>{' '}
              <span className="tabular-nums text-muted">{f.year}</span>
            </span>
            <span className="text-[10px] leading-none text-muted">{LEAGUE_STYLES[f.tier].label}</span>
          </span>
        )
      })}
    </div>
  )
}
