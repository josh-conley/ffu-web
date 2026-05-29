import type { Game } from '@/data'
import { nameForYear } from '@/config'
import { winnerOf } from '@/selectors'
import { TeamLogo } from './TeamLogo'

function ParticipantRow({ memberId, score, year, isWinner }: { memberId: string; score: number; year: string; isWinner: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-2 ${isWinner ? 'font-semibold' : 'text-slate-600 dark:text-slate-400'}`}>
      <span className="flex items-center gap-2 truncate">
        <TeamLogo ffuId={memberId} size={24} />
        <span className="truncate">{nameForYear(memberId, year) ?? memberId}</span>
      </span>
      <span className="tabular-nums">{score.toFixed(2)}</span>
    </div>
  )
}

export function MatchupCard({ game, year }: { game: Game; year: string }) {
  const winner = winnerOf(game)
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      {game.round && (
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {game.round}
        </div>
      )}
      <div className="space-y-1">
        {game.participants.map((p) => (
          <ParticipantRow key={p.memberId} memberId={p.memberId} score={p.score} year={year} isWinner={p.memberId === winner} />
        ))}
      </div>
    </div>
  )
}
