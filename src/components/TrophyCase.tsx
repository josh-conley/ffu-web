import { Fragment, type ReactNode } from 'react'
import { CUP_ACCENT, CUP_NAME } from '@/config'
import type { CareerStats, SeasonFinish } from '@/selectors'
import { CUP_HARDWARE, HARDWARE } from './hardware'
import { LEAGUE_STYLES, TIER_PRESTIGE } from './leagues'

const PLACES = [
  { place: 1, ordinal: '1st', hardware: HARDWARE.title },
  { place: 2, ordinal: '2nd', hardware: HARDWARE.second },
  { place: 3, ordinal: '3rd', hardware: HARDWARE.third },
] as const

/** Tier prestige (Premier hardware leads), then newest year. */
const byPrestige = (a: SeasonFinish, b: SeasonFinish) =>
  TIER_PRESTIGE.indexOf(a.tier) - TIER_PRESTIGE.indexOf(b.tier) || b.year.localeCompare(a.year)

interface TileProps {
  icon: ReactNode
  /** Bold inline lead-in on the year line ("1st", "Div"). */
  primary: string
  year: string
  /** The small line under the year: the league, or the Cup. */
  sub: string
  tooltip: string
}

function Tile({ icon, primary, year, sub, tooltip }: TileProps) {
  return (
    <span title={tooltip} className="flex aspect-square w-16 flex-col items-center justify-center gap-1 bg-surface-2 ring-1 ring-border">
      {icon}
      <span className="text-xs font-bold leading-none">
        {primary} <span className="tabular-nums">{year}</span>
      </span>
      <span className="text-[10px] leading-none text-muted">{sub}</span>
    </span>
  )
}

/** One diamond per FFU Cup won, newest first. */
function cupTiles(years: readonly string[]): ReactNode[] {
  const Icon = CUP_HARDWARE.icon
  return [...years].reverse().map((year) => (
    <Tile
      key={`cup-${year}`}
      icon={<Icon size={22} style={{ color: CUP_ACCENT }} aria-hidden />}
      primary="Cup"
      year={year}
      sub={CUP_NAME}
      tooltip={`${CUP_HARDWARE.label} · ${year}`}
    />
  ))
}

/** Placement (1st/2nd/3rd) tile groups, best first, then a pennant group for division winners.
 *  Cup diamonds sit right after league titles: both are a competition won outright. */
function tileGroups(career: CareerStats, cupTitles: readonly string[]): ReactNode[][] {
  const groups = PLACES.map(({ place, ordinal, hardware: { icon: Icon, label, match } }) =>
    career.finishes
      .filter(match)
      .sort(byPrestige)
      .map((f) => (
        <Tile
          key={`${place}-${f.tier}-${f.year}`}
          icon={<Icon size={22} className={LEAGUE_STYLES[f.tier].text} aria-hidden />}
          primary={ordinal}
          year={f.year}
          sub={LEAGUE_STYLES[f.tier].label}
          tooltip={`${LEAGUE_STYLES[f.tier].label} ${label} · ${f.year}`}
        />
      )),
  )
  const pennants = career.finishes
    .filter(HARDWARE.pennant.match)
    .sort(byPrestige)
    .map((f) => (
      <Tile
        key={`pennant-${f.tier}-${f.year}`}
        icon={<HARDWARE.pennant.icon size={24} className={LEAGUE_STYLES[f.tier].text} aria-hidden />}
        primary="Div"
        year={f.year}
        sub={LEAGUE_STYLES[f.tier].label}
        tooltip={`${LEAGUE_STYLES[f.tier].label} Division Winner · ${f.year}`}
      />
    ))
  const [titles, ...rest] = groups
  return [titles ?? [], cupTiles(cupTitles), ...rest, pennants].filter((g) => g.length > 0)
}

/** Career hardware as tier-colored square tiles: champion → Cup → runner-up → third → pennants
 *  (division winners), each group separated by a subtle vertical rule. Shared by the
 *  team-profile modal and the Members detail page. */
export function TrophyCase({ career, cupTitles }: { career: CareerStats; cupTitles: readonly string[] }) {
  const groups = tileGroups(career, cupTitles)
  if (groups.length === 0) return <p className="text-xs text-muted">None</p>
  return (
    <div className="flex flex-wrap items-stretch gap-2">
      {groups.map((tiles, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="w-px self-stretch bg-border" aria-hidden />}
          {tiles}
        </Fragment>
      ))}
    </div>
  )
}
