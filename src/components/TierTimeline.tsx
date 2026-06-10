import type { Tier } from '@/config'
import { SEASONS } from '@/config'
import { LEAGUE_STYLES } from './leagues'

// A member's league progression as a small SVG line chart: x = every FFU year (league-wide
// 2018→latest, NOT the member's tenure, so charts are comparable), y = tier rows. Segment and dot
// colors come from the tier tokens; a dashed marker notes the year Masters was introduced. Years a
// member sat out break the solid line into a dashed neutral connector.
//
// All text (year axis, marker label, key) is HTML, NOT svg <text>: SVG text scales with the
// rendered chart width, so it can never match the page's font sizes across screen sizes. The HTML
// labels are positioned with the same x-fractions the SVG uses, so they stay aligned at any width.

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
const H = 120
const PAD_X = 30
const PAD_T = 18
const ROW_GAP = 42
const xAt = (year: string) => PAD_X + (YEARS.indexOf(year) * (W - 2 * PAD_X)) / (YEARS.length - 1)
const xPct = (year: string) => `${(xAt(year) / W) * 100}%`
const yAt = (tier: Tier) => PAD_T + TIER_ROW[tier] * ROW_GAP

/** Tier gridlines + the dashed "Masters introduced" rule (its label is HTML, above the chart). */
function Frame() {
  return (
    <>
      {TIERS.map((tier) => (
        <line key={tier} x1={PAD_X} y1={yAt(tier)} x2={W - PAD_X} y2={yAt(tier)} stroke="currentColor" strokeWidth={1} className="text-border" />
      ))}
      {MASTERS_INTRO && (
        <line x1={xAt(MASTERS_INTRO)} y1={2} x2={xAt(MASTERS_INTRO)} y2={H - 2} stroke="currentColor" strokeWidth={1} strokeDasharray="3 3" className="text-masters" />
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
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
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
      {MASTERS_INTRO && (
        <div className="relative h-5">
          <span style={{ left: xPct(MASTERS_INTRO) }} className="absolute -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-masters">
            Masters introduced
          </span>
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="League tier by season" className="h-auto w-full">
        <Frame />
        <Progression rows={rows} />
      </svg>
      <div className="relative h-5 text-xs text-muted">
        {YEARS.map((year) => (
          <span key={year} style={{ left: xPct(year) }} className="absolute -translate-x-1/2 tabular-nums">
            {year}
          </span>
        ))}
      </div>
      <Legend showSatOut={hasGap} />
    </div>
  )
}
