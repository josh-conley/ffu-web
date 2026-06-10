import type { Tier } from '@/config'
import { SEASONS } from '@/config'
import { LEAGUE_STYLES } from './leagues'

// A member's league progression as a small SVG line chart: x = every FFU year (league-wide
// 2018→latest, NOT the member's tenure, so charts are comparable), y = tier rows. Segment and dot
// colors come from the tier tokens; a dashed marker notes the year Masters was introduced. Years a
// member sat out break the solid line into a dashed neutral connector. Tier rows are unlabeled —
// an HTML key below the chart identifies the colors (axis labels shrank the plot too much).

export interface TierSeason {
  year: string
  tier: Tier
}

const TIER_ROW: Record<Tier, number> = { PREMIER: 0, MASTERS: 1, NATIONAL: 2 }
const TIERS = Object.keys(TIER_ROW) as Tier[]
const YEARS = [...new Set(SEASONS.map((s) => s.year))].sort()
const MASTERS_INTRO = SEASONS.filter((s) => s.tier === 'MASTERS')
  .map((s) => s.year)
  .sort()[0]

const W = 600
const H = 162
const PAD_X = 26
const PAD_T = 36
const ROW_GAP = 42
const xAt = (year: string) => PAD_X + (YEARS.indexOf(year) * (W - 2 * PAD_X)) / (YEARS.length - 1)
const yAt = (tier: Tier) => PAD_T + TIER_ROW[tier] * ROW_GAP
const AXIS_Y = PAD_T + 2 * ROW_GAP + 32

/** Tier gridlines, year ticks, and the "Masters introduced" marker. */
function Frame() {
  const mx = MASTERS_INTRO ? xAt(MASTERS_INTRO) : null
  return (
    <>
      {TIERS.map((tier) => (
        <line key={tier} x1={PAD_X} y1={yAt(tier)} x2={W - PAD_X} y2={yAt(tier)} stroke="currentColor" strokeWidth={1} className="text-border" />
      ))}
      {YEARS.map((year) => (
        <text key={year} x={xAt(year)} y={AXIS_Y} textAnchor="middle" fontSize={14} fill="currentColor" className="text-muted">
          {year}
        </text>
      ))}
      {mx !== null && (
        <>
          <line x1={mx} y1={PAD_T - 12} x2={mx} y2={yAt('NATIONAL') + 14} stroke="currentColor" strokeWidth={1} strokeDasharray="3 3" className="text-masters" />
          <text x={mx} y={PAD_T - 18} textAnchor="middle" fontSize={12} fontWeight={600} fill="currentColor" className="text-masters">
            Masters introduced
          </text>
        </>
      )}
    </>
  )
}

/** The member's line: tier-colored segments between consecutive years; dashed across gap years. */
function Progression({ rows }: { rows: TierSeason[] }) {
  return (
    <>
      {rows.slice(1).map((season, i) => {
        const prev = rows[i]
        if (prev === undefined) return null
        const satOut = Number(season.year) - Number(prev.year) > 1
        return (
          <line
            key={season.year}
            x1={xAt(prev.year)}
            y1={yAt(prev.tier)}
            x2={xAt(season.year)}
            y2={yAt(season.tier)}
            stroke="currentColor"
            strokeWidth={3}
            strokeDasharray={satOut ? '5 5' : undefined}
            className={satOut ? 'text-muted' : LEAGUE_STYLES[season.tier].text}
          />
        )
      })}
      {rows.map((season) => (
        <circle key={season.year} cx={xAt(season.year)} cy={yAt(season.tier)} r={6} fill="currentColor" stroke="var(--color-surface)" strokeWidth={2} className={LEAGUE_STYLES[season.tier].text}>
          <title>{`${season.year} · ${LEAGUE_STYLES[season.tier].label}`}</title>
        </circle>
      ))}
    </>
  )
}

/** Color key for the tier rows (+ the dashed sat-out connector when one is drawn). */
function Legend({ showSatOut }: { showSatOut: boolean }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      {TIERS.map((tier) => (
        <span key={tier} className="inline-flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${LEAGUE_STYLES[tier].dot}`} aria-hidden />
          {LEAGUE_STYLES[tier].label}
        </span>
      ))}
      {showSatOut && (
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 border-t-2 border-dashed border-muted" aria-hidden />
          Sat out
        </span>
      )}
    </div>
  )
}

export function TierTimeline({ seasons }: { seasons: TierSeason[] }) {
  const rows = [...seasons].sort((a, b) => Number(a.year) - Number(b.year))
  const hasGap = rows.some((r, i) => i > 0 && Number(r.year) - Number(rows[i - 1]?.year) > 1)
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="League tier by season" className="h-auto w-full">
        <Frame />
        <Progression rows={rows} />
      </svg>
      <Legend showSatOut={hasGap} />
    </div>
  )
}
