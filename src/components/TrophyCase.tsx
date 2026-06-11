import { Fragment, type ReactNode } from 'react'
import { FaTrophy, FaMedal, FaAward } from 'react-icons/fa6'
import { TbPennantFilled } from 'react-icons/tb'
import type { CareerStats, SeasonFinish } from '@/selectors'
import { LEAGUE_STYLES, TIER_PRESTIGE } from './leagues'

const HARDWARE = {
  1: { icon: FaTrophy, ordinal: '1st', label: 'Champion' },
  2: { icon: FaMedal, ordinal: '2nd', label: 'Runner-up' },
  3: { icon: FaAward, ordinal: '3rd', label: 'Third place' },
} as const

/** Tier prestige (Premier hardware leads), then newest year. */
const byPrestige = (a: SeasonFinish, b: SeasonFinish) =>
  TIER_PRESTIGE.indexOf(a.tier) - TIER_PRESTIGE.indexOf(b.tier) || b.year.localeCompare(a.year)

interface TileProps {
  icon: ReactNode
  /** Bold inline lead-in on the year line ("1st", "Div"). */
  primary: string
  year: string
  tier: SeasonFinish['tier']
  tooltip: string
}

function Tile({ icon, primary, year, tier, tooltip }: TileProps) {
  return (
    <span title={tooltip} className="flex aspect-square w-16 flex-col items-center justify-center gap-1 bg-surface-2 ring-1 ring-border">
      {icon}
      <span className="text-xs font-bold leading-none">
        {primary} <span className="tabular-nums">{year}</span>
      </span>
      <span className="text-[10px] leading-none text-muted">{LEAGUE_STYLES[tier].label}</span>
    </span>
  )
}

/** Placement (1st/2nd/3rd) tile groups, best first, then a pennant group for division winners. */
function tileGroups(career: CareerStats): ReactNode[][] {
  const groups = ([1, 2, 3] as const).map((place) =>
    career.finishes
      .filter((f) => f.finalPlacement === place)
      .sort(byPrestige)
      .map((f) => {
        const { icon: Icon, ordinal, label } = HARDWARE[place]
        return (
          <Tile
            key={`${place}-${f.tier}-${f.year}`}
            icon={<Icon size={22} className={LEAGUE_STYLES[f.tier].text} aria-hidden />}
            primary={ordinal}
            year={f.year}
            tier={f.tier}
            tooltip={`${LEAGUE_STYLES[f.tier].label} ${label} · ${f.year}`}
          />
        )
      }),
  )
  const pennants = career.finishes
    .filter((f) => f.wonDivision)
    .sort(byPrestige)
    .map((f) => (
      <Tile
        key={`pennant-${f.tier}-${f.year}`}
        icon={<TbPennantFilled size={24} className={LEAGUE_STYLES[f.tier].text} aria-hidden />}
        primary="Div"
        year={f.year}
        tier={f.tier}
        tooltip={`${LEAGUE_STYLES[f.tier].label} Division Winner · ${f.year}`}
      />
    ))
  return [...groups, pennants].filter((g) => g.length > 0)
}

/** Career hardware as tier-colored square tiles: champion → runner-up → third → pennants
 *  (division winners), each group separated by a subtle vertical rule. Shared by the
 *  team-profile modal and the Members detail page. */
export function TrophyCase({ career }: { career: CareerStats }) {
  const groups = tileGroups(career)
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
