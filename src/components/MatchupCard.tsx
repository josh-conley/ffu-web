import type { Game } from '@/data'
import { nameForYear } from '@/config'
import { winnerOf } from '@/selectors'
import { TeamLogo } from './TeamLogo'

function ParticipantRow({ memberId, score, year, isWinner }: { memberId: string; score: number; year: string; isWinner: boolean }) {
  return (
    <div
      className={`flex items-center justify-between gap-2 border-l-2 pl-2 ${
        isWinner ? 'border-accent font-semibold' : 'border-transparent text-muted'
      }`}
    >
      <span className="flex items-center gap-2 truncate">
        <TeamLogo ffuId={memberId} size={24} />
        <span className="truncate">{nameForYear(memberId, year) ?? memberId}</span>
      </span>
      <span className="font-mono tabular-nums">{score.toFixed(2)}</span>
    </div>
  )
}

export function MatchupCard({ game, year }: { game: Game; year: string }) {
  const winner = winnerOf(game)
  return (
    <div className="border border-border bg-surface p-3 shadow-sm">
      {game.round && (
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
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
