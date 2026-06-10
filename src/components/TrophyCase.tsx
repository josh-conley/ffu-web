import { FaTrophy, FaMedal, FaAward } from 'react-icons/fa6'
import type { CareerStats, SeasonFinish } from '@/selectors'
import { LEAGUE_STYLES } from './leagues'

const PODIUM = {
  1: { icon: FaTrophy, ordinal: '1st', label: 'Champion' },
  2: { icon: FaMedal, ordinal: '2nd', label: 'Runner-up' },
  3: { icon: FaAward, ordinal: '3rd', label: 'Third place' },
} as const

function isPodium(f: SeasonFinish): f is SeasonFinish & { finalPlacement: 1 | 2 | 3 } {
  return f.finalPlacement !== null && f.finalPlacement <= 3
}

/** Podium finishes as tier-colored chips — icon + ordinal + year (champion → runner-up → third,
 *  then by year). Shared by the team-profile modal and the Members detail page. */
export function TrophyCase({ career }: { career: CareerStats }) {
  const podiums = career.finishes
    .filter(isPodium)
    .sort((a, b) => a.finalPlacement - b.finalPlacement || a.year.localeCompare(b.year))
  if (podiums.length === 0) return <p className="text-xs text-muted">No podium finishes — yet.</p>
  return (
    <div className="flex flex-wrap gap-1.5">
      {podiums.map((f) => {
        const { icon: Icon, ordinal, label } = PODIUM[f.finalPlacement]
        return (
          <span key={`${f.year}-${f.tier}-${f.finalPlacement}`} title={`${LEAGUE_STYLES[f.tier].label} ${label} · ${f.year}`} className="inline-flex items-center gap-1.5 bg-surface-2 px-2 py-1 text-xs font-medium tabular-nums ring-1 ring-border">
            <Icon size={12} className={LEAGUE_STYLES[f.tier].text} aria-hidden />
            <span className={`font-semibold ${LEAGUE_STYLES[f.tier].text}`}>{ordinal}</span>
            <span className="text-muted">{f.year}</span>
          </span>
        )
      })}
    </div>
  )
}
