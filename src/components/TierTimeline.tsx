import { Fragment } from 'react'
import type { Tier } from '@/config'
import { SEASONS } from '@/config'
import { LEAGUE_STYLES } from './leagues'

// A member's league progression as a small SVG line chart: x = every FFU year (league-wide
// 2018→latest, NOT the member's tenure, so charts are comparable), y = tier rows. Segment and dot
// colors come from the tier tokens; a dashed marker notes the year Masters was introduced. Years a
// member sat out break the solid line into a dashed neutral connector.

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
const H = 168
const PAD_L = 74
const PAD_R = 20
const PAD_T = 30
const ROW_GAP = 42
const xAt = (year: string) => PAD_L + (YEARS.indexOf(year) * (W - PAD_L - PAD_R)) / (YEARS.length - 1)
const yAt = (tier: Tier) => PAD_T + TIER_ROW[tier] * ROW_GAP
const AXIS_Y = PAD_T + 2 * ROW_GAP + 28

/** Tier row labels + gridlines, year ticks, and the "Masters introduced" marker. */
function Frame() {
  const mx = MASTERS_INTRO ? xAt(MASTERS_INTRO) : null
  return (
    <>
      {TIERS.map((tier) => (
        <Fragment key={tier}>
          <line x1={PAD_L} y1={yAt(tier)} x2={W - PAD_R} y2={yAt(tier)} stroke="currentColor" strokeWidth={1} className="text-border" />
          <text x={PAD_L - 10} y={yAt(tier) + 3.5} textAnchor="end" fontSize={11} fontWeight={600} fill="currentColor" className={LEAGUE_STYLES[tier].text}>
            {LEAGUE_STYLES[tier].label}
          </text>
        </Fragment>
      ))}
      {YEARS.map((year) => (
        <text key={year} x={xAt(year)} y={AXIS_Y} textAnchor="middle" fontSize={10} fill="currentColor" className="text-muted">
          {year}
        </text>
      ))}
      {mx !== null && (
        <>
          <line x1={mx} y1={PAD_T - 10} x2={mx} y2={yAt('NATIONAL') + 12} stroke="currentColor" strokeWidth={1} strokeDasharray="3 3" className="text-masters" />
          <text x={mx} y={PAD_T - 16} textAnchor="middle" fontSize={9} fontWeight={600} fill="currentColor" className="text-masters">
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
            strokeWidth={2.5}
            strokeDasharray={satOut ? '4 4' : undefined}
            className={satOut ? 'text-muted' : LEAGUE_STYLES[season.tier].text}
          />
        )
      })}
      {rows.map((season) => (
        <circle key={season.year} cx={xAt(season.year)} cy={yAt(season.tier)} r={5} fill="currentColor" stroke="var(--color-surface)" strokeWidth={2} className={LEAGUE_STYLES[season.tier].text}>
          <title>{`${season.year} · ${LEAGUE_STYLES[season.tier].label}`}</title>
        </circle>
      ))}
    </>
  )
}

export function TierTimeline({ seasons }: { seasons: TierSeason[] }) {
  const rows = [...seasons].sort((a, b) => Number(a.year) - Number(b.year))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="League tier by season" className="h-auto w-full">
      <Frame />
      <Progression rows={rows} />
    </svg>
  )
}
