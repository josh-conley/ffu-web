import { SMALL_SAMPLE, type OddsFormat, type RecordOddsTable, type TiedRecord } from '@/selectors'
import { recordLabel, yearSpan } from './format'
import { TeamList } from './PlayoffOddsTable'

/** Why the shorter seasons are opt-in, shown while they are pooled in. */
export function ShorterSeasonsNote({ primary, others }: { primary: OddsFormat; others: OddsFormat[] }) {
  return (
    <p className="text-xs text-muted">
      {others.map((f) => `${yearSpan(f)} seasons had ${f.seasonLength} regular-season games`).join('; ')}, not{' '}
      {primary.seasonLength}: at the same record, those teams had fewer games left to play.
    </p>
  )
}

function tieText(t: TiedRecord): string {
  const label = recordLabel(t.record)
  if (t.odds.teams === 0) return `${label}: no team before this season`
  const team = t.odds.teams === 1 ? 'team' : 'teams'
  return `${label}: ${t.odds.made} of ${t.odds.teams} ${team} made the playoffs`
}

/** The footnotes under the table: tied records, and what the greyed numbers mean. */
export function PlayoffOddsNotes({ table, year }: { table: RecordOddsTable; year: string }) {
  const tiedNow = table.ties.filter((t) => t.current.length > 0)
  return (
    <ul className="space-y-1 text-xs text-muted">
      {table.ties.length > 0 && (
        <li>Tied records are left out of the table. After {table.games} games, {table.ties.map(tieText).join('; ')}.</li>
      )}
      {tiedNow.map((t) => (
        <li key={recordLabel(t.record)} className="flex flex-wrap items-center gap-x-2">
          <span>
            {year} teams at {recordLabel(t.record)}:
          </span>
          <TeamList teams={t.current} year={year} />
        </li>
      ))}
      <li>Grey numbers come from fewer than {SMALL_SAMPLE} teams. Hover a win or loss cell for its count.</li>
    </ul>
  )
}
