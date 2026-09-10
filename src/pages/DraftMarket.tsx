import { useMemo } from 'react'
import { FaArrowUpLong, FaArrowDownLong } from 'react-icons/fa6'
import { LIVE_LEAGUE_IDS } from '@/config'
import { useAdp, useYearDrafts } from '@/hooks/useYearDrafts'
import { useUrlState } from '@/hooks/useUrlState'
import {
  biggestReaches,
  biggestValues,
  marketPositions,
  pickComparisons,
  playerMarkets,
  type Baseline,
} from '@/selectors'
import { BoardTable, ComparisonTable } from '@/components/draft/MarketTables'
import { segButton, SELECT } from '@/components/controls'
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
  const [position, setPosition] = useUrlState('pos', '')

  const markets = useMemo(() => playerMarkets(drafts), [drafts])
  const comparisons = useMemo(() => pickComparisons(markets, adp), [markets, adp])
  const positions = useMemo(() => marketPositions(markets), [markets])

  const active: Baseline = baseline === 'sleeper' && Object.keys(adp).length > 0 ? 'sleeper' : 'ffu'
  const scoped = useMemo(
    () => (position ? comparisons.filter((c) => c.player.position === position) : comparisons),
    [comparisons, position],
  )
  const board = useMemo(
    () => (position ? markets.filter((m) => m.player.position === position) : markets),
    [markets, position],
  )

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  if (drafts.length === 0) return <ErrorMessage error={`No ${YEAR} drafts to compare yet.`} />

  const caption = BASELINES.find((b) => b.key === active)?.caption
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">Draft Board Comparison</h1>
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
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Position</span>
          <select className={`${SELECT} w-32`} value={position} onChange={(e) => setPosition(e.target.value)} aria-label="Position">
            <option value="">All</option>
            {positions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
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
