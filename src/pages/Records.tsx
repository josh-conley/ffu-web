import { useMemo } from 'react'
import { getMember, nameForYear } from '@/config'
import { useAllSeasons } from '@/hooks/useLeagueData'
import { useUrlState } from '@/hooks/useUrlState'
import { useFilters, type FilterDef } from '@/hooks/useFilters'
import { buildRecordBook, type MatchupRecord, type TeamGameRecord } from '@/selectors'
import { DataTable, type Column } from '@/components/DataTable'
import { FilterBar } from '@/components/FilterBar'
import { SELECT } from '@/components/controls'
import { LEAGUE_STYLES } from '@/components/leagues'
import { LeagueBadge } from '@/components/LeagueBadge'
import { TeamLogo } from '@/components/TeamLogo'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

type Ranked<T> = T & { rank: number }
type MatchupMode = 'blowout' | 'closest' | 'highCombined' | 'lowCombined'
type AnyRecord = TeamGameRecord | MatchupRecord

const TIER_OPTIONS = (['PREMIER', 'MASTERS', 'NATIONAL'] as const).map((t) => ({ value: t, label: LEAGUE_STYLES[t].label }))

/** Does a record involve this member? Matchups check both teams; a team-game record is the scorer's. */
const involvesMember = (r: AnyRecord, id: string): boolean =>
  'teams' in r ? r.teams.some((t) => t.memberId === id) : r.memberId === id

const MODES = [
  { key: 'highest', label: 'Highest Scores', kind: 'team' },
  { key: 'lowest', label: 'Lowest Scores', kind: 'team' },
  { key: 'blowout', label: 'Biggest Blowouts', kind: 'matchup' },
  { key: 'closest', label: 'Closest Games', kind: 'matchup' },
  { key: 'highCombined', label: 'Highest Combined', kind: 'matchup' },
  { key: 'lowCombined', label: 'Lowest Combined', kind: 'matchup' },
] as const

const TEAM_MODES = MODES.filter((m) => m.kind === 'team')
const MATCHUP_MODES = MODES.filter((m) => m.kind === 'matchup')

function rank<T>(rows: T[]): Ranked<T>[] {
  return rows.map((row, i) => ({ ...row, rank: i + 1 }))
}

function SeasonCell({ year, tier, week, round }: { year: string; tier: TeamGameRecord['tier']; week: number; round?: string }) {
  return (
    <span className="flex items-center gap-2 whitespace-nowrap text-muted">
      <span className="tabular-nums">{year}</span>
      <LeagueBadge tier={tier} />
      <span>{round ?? `Wk ${week}`}</span>
    </span>
  )
}

function TeamCell({ ffuId, year }: { ffuId: string; year: string }) {
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <TeamLogo ffuId={ffuId} size={22} />
      {nameForYear(ffuId, year) ?? ffuId}
    </span>
  )
}

function teamColumns(): Column<Ranked<TeamGameRecord>>[] {
  return [
    { key: 'rank', header: '#', render: (r) => r.rank, sortValue: (r) => r.rank },
    { key: 'team', header: 'Team', render: (r) => <TeamCell ffuId={r.memberId} year={r.year} /> },
    { key: 'score', header: 'Score', align: 'right', render: (r) => r.score.toFixed(2), sortValue: (r) => r.score },
    { key: 'opp', header: 'Opponent', render: (r) => `${nameForYear(r.opponentId, r.year) ?? r.opponentId} (${r.opponentScore.toFixed(2)})` },
    { key: 'season', header: 'When', render: (r) => <SeasonCell year={r.year} tier={r.tier} week={r.week} round={r.round} /> },
  ]
}

function matchupColumns(mode: MatchupMode): Column<Ranked<MatchupRecord>>[] {
  const isCombined = mode === 'highCombined' || mode === 'lowCombined'
  const metric: Column<Ranked<MatchupRecord>> = isCombined
    ? { key: 'combined', header: 'Total', align: 'right', render: (r) => r.combined.toFixed(2), sortValue: (r) => r.combined }
    : { key: 'margin', header: 'Margin', align: 'right', render: (r) => r.margin.toFixed(2), sortValue: (r) => r.margin }
  return [
    { key: 'rank', header: '#', render: (r) => r.rank, sortValue: (r) => r.rank },
    {
      key: 'matchup',
      header: 'Matchup',
      render: (r) => (
        <span className="flex flex-col gap-0.5">
          {r.teams.map((t) => (
            <span key={t.memberId} className={`flex items-center gap-2 ${t.memberId === r.winnerId ? 'font-semibold' : ''}`}>
              <TeamLogo ffuId={t.memberId} size={20} />
              <span>{nameForYear(t.memberId, r.year) ?? t.memberId}</span>
              <span className="font-mono tabular-nums text-muted">{t.score.toFixed(2)}</span>
            </span>
          ))}
        </span>
      ),
    },
    metric,
    { key: 'season', header: 'When', render: (r) => <SeasonCell year={r.year} tier={r.tier} week={r.week} round={r.round} /> },
  ]
}

export function Records() {
  const { data: seasons, loading, error } = useAllSeasons()
  const [mode, setMode] = useUrlState('record', 'highest')
  const active = MODES.find((m) => m.key === mode) ?? MODES[0]

  const book = useMemo(() => (seasons ? buildRecordBook(seasons) : undefined), [seasons])
  const teamCols = useMemo(() => teamColumns(), [])
  const matchupCols = useMemo(() => matchupColumns(mode as MatchupMode), [mode])

  const yearOptions = useMemo(
    () => [...new Set((seasons ?? []).map((s) => s.year))].sort().reverse().map((y) => ({ value: y, label: y })),
    [seasons],
  )
  const memberOptions = useMemo(() => {
    const ids = new Set<string>()
    for (const s of seasons ?? []) for (const t of s.teams) ids.add(t.memberId)
    return [...ids].map((id) => ({ value: id, label: getMember(id)?.name ?? id })).sort((a, b) => a.label.localeCompare(b.label))
  }, [seasons])

  const filterDefs = useMemo<FilterDef<AnyRecord>[]>(
    () => [
      { key: 'tier', label: 'League', options: TIER_OPTIONS, predicate: (r, v) => r.tier === v },
      { key: 'year', label: 'Year', options: yearOptions, predicate: (r, v) => r.year === v },
      { key: 'member', label: 'Team', options: memberOptions, predicate: (r, v) => involvesMember(r, v) },
    ],
    [yearOptions, memberOptions],
  )

  // Stable reference to the active leaderboard's rows (book arrays are pre-sorted, full lists).
  const activeRows = useMemo<AnyRecord[]>(() => {
    if (!book) return []
    if (active.kind === 'team') return active.key === 'highest' ? book.highestGames : book.lowestGames
    return matchupRows(book, active.key as MatchupMode)
  }, [book, active.kind, active.key])
  const { rows: filtered, values, setValue, clear, activeCount } = useFilters(filterDefs, activeRows)
  const tableKey = active.key + JSON.stringify(values)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold uppercase tracking-tight">Records</h1>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Record</span>
          <select className={`${SELECT} w-full sm:w-56`} value={active.key} onChange={(e) => setMode(e.target.value)} aria-label="Record type">
            <optgroup label="Single Game">
              {TEAM_MODES.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </optgroup>
            <optgroup label="Matchups">
              {MATCHUP_MODES.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </optgroup>
          </select>
        </label>
        <FilterBar defs={filterDefs} values={values} onChange={setValue} onClear={clear} activeCount={activeCount} />
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage error={error} />}
      {book &&
        (filtered.length === 0 ? (
          <p className="text-muted">No records match these filters.</p>
        ) : active.kind === 'team' ? (
          // safe: activeRows (and so `filtered`) are team-game records in this mode
          <DataTable key={tableKey} columns={teamCols} rows={rank(filtered as TeamGameRecord[])} getRowKey={(r) => `${r.year}-${r.tier}-${r.week}-${r.memberId}`} pageSize={15} />
        ) : (
          <DataTable key={tableKey} columns={matchupCols} rows={rank(filtered as MatchupRecord[])} getRowKey={(r) => `${r.year}-${r.tier}-${r.week}-${r.teams[0]?.memberId ?? ''}`} pageSize={15} />
        ))}
    </div>
  )
}

function matchupRows(book: ReturnType<typeof buildRecordBook>, mode: MatchupMode): MatchupRecord[] {
  switch (mode) {
    case 'blowout':
      return book.biggestBlowouts
    case 'closest':
      return book.closestGames
    case 'highCombined':
      return book.highestCombined
    case 'lowCombined':
      return book.lowestCombined
  }
}
