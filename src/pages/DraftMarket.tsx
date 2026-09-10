import { useMemo } from 'react'
import { FaArrowUpLong, FaArrowDownLong } from 'react-icons/fa6'
import { LIVE_LEAGUE_IDS, nameForYear } from '@/config'
import type { Tier } from '@/config'
import { useAdp, useYearDrafts } from '@/hooks/useYearDrafts'
import { useUrlState } from '@/hooks/useUrlState'
import { applyFilters, useFilters, type FilterDef } from '@/hooks/useFilters'
import {
  biggestReaches,
  biggestValues,
  marketPositions,
  marketTeams,
  pickComparisons,
  playerMarkets,
  type Baseline,
  type PickComparison,
  type PlayerMarket,
} from '@/selectors'
import { BoardTable, ComparisonTable } from '@/components/draft/MarketTables'
import { FilterBar } from '@/components/FilterBar'
import { LEAGUE_STYLES, TIER_PRESTIGE } from '@/components/leagues'
import { segButton } from '@/components/controls'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

// The year is pinned rather than picked: an ADP snapshot only exists for the season being played
// (see scripts/backfill-adp.mjs), so a season selector would offer years with nothing behind them.
// Taken from LIVE_LEAGUE_IDS, which is the one place that says which season that is — not from
// CUP_YEAR, which happens to match today but means something else entirely.
const YEAR = Object.keys(LIVE_LEAGUE_IDS).sort().at(-1) ?? ''

const BASELINES: { key: Baseline; label: string; caption: string }[] = [
  {
    key: 'ffu',
    label: 'vs FFU',
    caption:
      'Each pick against where the OTHER two leagues took the same player. The pick being judged is left out of its own average — with three leagues, including it drags every baseline a third of the way toward the pick and hides the disagreement.',
  },
  {
    key: 'sleeper',
    label: 'vs Sleeper ADP',
    caption: 'Each pick against Sleeper’s half-PPR ADP, snapshotted around draft time.',
  },
]

const tierLabel = (tier: Tier) => LEAGUE_STYLES[tier].label

/**
 * The filter row. Two def sets over the same URL values, because the two tables hold different
 * things: a comparison row is ONE league's pick, so League/Team ask about that pick directly; a
 * board row is a player up to three leagues took, so they ask whether ANY of those picks matches.
 * Keeping both here means the labels and options are written once and can't drift apart.
 */
function filterDefs(teams: ReturnType<typeof marketTeams>, positions: string[], year: string) {
  const leagueOptions = TIER_PRESTIGE.map((tier) => ({ value: tier, label: tierLabel(tier) }))
  const teamOptions = teams.map(({ memberId, tier }) => ({
    value: memberId,
    label: `${nameForYear(memberId, year) ?? memberId} · ${tierLabel(tier)}`,
  }))
  const positionOptions = positions.map((p) => ({ value: p, label: p }))

  const comparison: FilterDef<PickComparison>[] = [
    { key: 'league', label: 'League', options: leagueOptions, predicate: (c, v) => c.tier === v },
    { key: 'team', label: 'Team', options: teamOptions, predicate: (c, v) => c.memberId === v },
    { key: 'pos', label: 'Position', options: positionOptions, predicate: (c, v) => c.player.position === v },
  ]
  const board: FilterDef<PlayerMarket>[] = [
    { key: 'league', label: 'League', options: leagueOptions, predicate: (m, v) => m.picks.some((p) => p.tier === v) },
    { key: 'team', label: 'Team', options: teamOptions, predicate: (m, v) => m.picks.some((p) => p.memberId === v) },
    { key: 'pos', label: 'Position', options: positionOptions, predicate: (m, v) => m.player.position === v },
  ]
  return { comparison, board }
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-text">
        <span className="text-accent">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

/**
 * Draft board comparison — who each league reached for, and who fell to them.
 *
 * Two baselines, because they answer different questions: FFU ADP is these thirty-six managers
 * disagreeing with each other, Sleeper ADP is all of them against the wider market.
 */
export function DraftMarket() {
  const { drafts, loading, error } = useYearDrafts(YEAR)
  const { adp, capturedAt } = useAdp(YEAR)
  const [baseline, setBaseline] = useUrlState('vs', 'ffu')

  const markets = useMemo(() => playerMarkets(drafts), [drafts])
  const comparisons = useMemo(() => pickComparisons(markets, adp), [markets, adp])
  const defs = useMemo(
    () => filterDefs(marketTeams(drafts), marketPositions(markets), YEAR),
    [drafts, markets],
  )

  const { rows: scoped, values, setValue, clear, activeCount } = useFilters(defs.comparison, comparisons)
  const board = useMemo(() => applyFilters(defs.board, values, markets), [defs.board, values, markets])
  const active: Baseline = baseline === 'sleeper' && Object.keys(adp).length > 0 ? 'sleeper' : 'ffu'

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  if (drafts.length === 0) return <ErrorMessage error={`No ${YEAR} drafts to compare yet.`} />

  const caption = BASELINES.find((b) => b.key === active)?.caption
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        {/* Year from YEAR, not written in: the page follows the season being played. */}
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">{`${YEAR} ADP Comparison`}</h1>
        <p className="max-w-2xl text-sm text-muted">{caption}</p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex gap-1">
          {BASELINES.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => setBaseline(b.key)}
              aria-pressed={b.key === active}
              disabled={b.key === 'sleeper' && Object.keys(adp).length === 0}
              className={segButton(b.key === active)}
            >
              {b.label}
            </button>
          ))}
        </div>
        <FilterBar
          defs={defs.comparison}
          values={values}
          onChange={setValue}
          onClear={clear}
          activeCount={activeCount}
        />
      </div>

      <Section title="Biggest Reaches" icon={<FaArrowUpLong aria-hidden />}>
        <ComparisonTable rows={biggestReaches(scoped, undefined, active)} baseline={active} year={YEAR} />
      </Section>

      <Section title="Biggest Values" icon={<FaArrowDownLong aria-hidden />}>
        <ComparisonTable rows={biggestValues(scoped, undefined, active)} baseline={active} year={YEAR} />
      </Section>

      <Section title="Every Player" icon={<span className="font-mono text-xs">#</span>}>
        <BoardTable markets={board} adp={adp} />
        <p className="text-xs text-muted">
          A player only one league drafted has no other league to be compared with, so they appear here but not in the
          lists above.
          {capturedAt && ` Sleeper ADP captured ${capturedAt}.`}
        </p>
      </Section>
    </div>
  )
}
