import { useMemo } from 'react'
import { CUP_PICKEM_POINTS, nameForYear } from '@/config'
import { CUP_ROUND_KEYS } from '@/config/cup'
import { EMPTY_PICKS, pickBracket } from '@/lib/cupPickem'
import type { SeasonData, Tournament } from '@/data'
import { maxPickemPoints, type ResolvedTournament } from '@/selectors'
import { usePickemBoard } from '@/hooks/usePickemBoard'
import { LoadingSpinner } from '../../LoadingSpinner'
import { ErrorMessage } from '../../ErrorMessage'
import { CupSection } from '../parts'
import { PickemEntryForm } from './PickemEntryForm'
import { PickemLeaderboard } from './PickemLeaderboard'

// The Cup pick'em tab. Open: the entry form and who's in so far. Locked: the leaderboard. The
// server (workers/pickem) decides which, from the Cup's own `pickemLocksAt`.

const LOCK_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })

function Rules({ tournament, locksAt }: { tournament: Tournament; locksAt: string | undefined }) {
  const perRound = CUP_ROUND_KEYS.map((k) => CUP_PICKEM_POINTS[k]).join(' / ')
  const max = maxPickemPoints(pickBracket(tournament, EMPTY_PICKS))
  return (
    <p className="max-w-3xl text-sm text-muted">
      Call the whole bracket before the first game. One entry per team: choose yourself, and saving again replaces your bracket.
      Correct picks score {perRound} points by round ({max} for a perfect bracket); nobody can
      see anyone else&apos;s picks until entries lock{locksAt ? <>, at <strong className="text-text">{LOCK_FORMAT.format(new Date(locksAt))}</strong></> : null}.
    </p>
  )
}

export function PickemPanel({ tournament, played, seasons, year }: {
  tournament: Tournament
  played: ResolvedTournament | undefined
  /** The Cup season's league files: the matchup modal's season figures. */
  seasons: SeasonData[]
  year: string
}) {
  const board = usePickemBoard(year, true)
  const tierOf = useMemo(() => new Map(tournament.participants.map((p) => [p.ffuId, p.tier])), [tournament])
  const seedOf = useMemo(() => new Map(tournament.participants.flatMap((p) => (p.seed !== undefined ? [[p.ffuId, p.seed] as const] : []))), [tournament])
  const entered = useMemo(() => new Set(board.data?.entries.map((e) => e.ffuId)), [board.data])

  if (board.error) return <ErrorMessage error={board.error} />
  if (!board.data) return <LoadingSpinner />
  const { open, locked, locksAt, entries } = board.data

  if (locked && played) {
    return (
      <CupSection title="Pick'em leaderboard" lede={`${entries.length} brackets, scored live as the Cup is played.`}>
        <PickemLeaderboard tournament={tournament} played={played} entries={entries} year={year} tierOf={tierOf} seedOf={seedOf} seasons={seasons} />
      </CupSection>
    )
  }
  if (!open) return <p className="text-sm text-muted">Pick&apos;em isn&apos;t open yet.</p>
  return (
    <div className="space-y-8">
      <CupSection title="Pick'em">
        <Rules tournament={tournament} locksAt={locksAt} />
        <p className="text-sm">
          <strong>{entries.length}</strong> of {tournament.participants.length} teams in
          {entries.length > 0 && <span className="text-muted">: {entries.map((e) => nameForYear(e.ffuId, year) ?? e.ffuId).join(', ')}</span>}
        </p>
      </CupSection>
      <PickemEntryForm tournament={tournament} year={year} tierOf={tierOf} seedOf={seedOf} seasons={seasons} entered={entered} onSaved={board.reload} />
    </div>
  )
}
