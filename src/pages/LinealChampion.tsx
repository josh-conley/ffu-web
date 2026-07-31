import { useMemo } from 'react'
import { FaCrown } from 'react-icons/fa6'
import { getMember } from '@/config'
import { useAllSeasons } from '@/hooks/useLeagueData'
import { linealHistory, linealHolderTotals, type LinealHolderTotal } from '@/selectors'
import { DataTable, type Column } from '@/components/DataTable'
import { LinealBelt } from '@/components/LinealBelt'
import { LinealLineage } from '@/components/LinealLineage'
import { TeamLogo } from '@/components/TeamLogo'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

function holderColumns(): Column<LinealHolderTotal & { rank: number }>[] {
  return [
    { key: 'rank', header: '#', render: (r) => r.rank, sortValue: (r) => r.rank },
    {
      key: 'team',
      header: 'Team',
      render: (r) => (
        <span className="flex items-center gap-2 whitespace-nowrap">
          <TeamLogo ffuId={r.memberId} size={22} />
          {getMember(r.memberId)?.name ?? r.memberId}
          {r.current && <FaCrown className="text-accent" aria-label="Current lineal champion" />}
        </span>
      ),
    },
    { key: 'weeksHeld', header: 'Weeks Held', align: 'right', render: (r) => r.weeksHeld, sortValue: (r) => r.weeksHeld },
    { key: 'reigns', header: 'Reigns', align: 'right', render: (r) => r.reigns, sortValue: (r) => r.reigns },
    { key: 'defenses', header: 'Defenses', align: 'right', render: (r) => r.defenses, sortValue: (r) => r.defenses },
    { key: 'longestReign', header: 'Longest', align: 'right', render: (r) => r.longestReign, sortValue: (r) => r.longestReign },
    { key: 'firstWon', header: 'First Won', align: 'right', render: (r) => `${r.firstWon.year} Wk ${r.firstWon.week}`, sortValue: (r) => `${r.firstWon.year}${String(r.firstWon.week).padStart(2, '0')}` },
  ]
}

/**
 * The Lineal FFU Championship: a belt that starts with the league's first champion and passes to
 * whoever beats the holder — every game, every tier. See `selectors/lineal.ts` for the rules.
 */
export function LinealChampion() {
  const { data: seasons, loading, error } = useAllSeasons()

  const history = useMemo(() => (seasons ? linealHistory(seasons) : undefined), [seasons])
  const holders = useMemo(() => (history ? linealHolderTotals(history.reigns) : []), [history])
  const columns = useMemo(() => holderColumns(), [])
  const ranked = useMemo(() => holders.map((h, i) => ({ ...h, rank: i + 1 })), [holders])

  const current = history?.reigns.find((r) => r.current)
  // Newest first — the recent lineage is what people are arguing about.
  const lineage = useMemo(() => [...(history?.reigns ?? [])].reverse(), [history])

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">Lineal Championship</h1>
        <p className="max-w-3xl text-sm text-muted">
          Boxing rules. The belt starts with the first FFU champion and changes hands the moment its holder
          loses — any game, any week, any league, playoffs or Toilet Bowl alike. A tie keeps it. Whoever beat
          the man who beat the man is the lineal champion.
        </p>
      </header>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage error={error} />}

      {history && current && (
        <>
          <LinealBelt reign={current} />

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Every Holder</h2>
            <p className="text-sm text-muted">
              Weeks are football weeks: idle weeks (byes, eliminations, seasons away) count, and an offseason
              counts as a single week — the belt keeps travelling with its holder until someone takes it.
            </p>
            <DataTable columns={columns} rows={ranked} getRowKey={(r) => r.memberId} />
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted">The Lineage · {history.reigns.length} Reigns</h2>
            <LinealLineage reigns={lineage} />
          </section>
        </>
      )}
    </div>
  )
}
