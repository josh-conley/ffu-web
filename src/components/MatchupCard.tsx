import type { Game } from '@/data'
import { nameForYear } from '@/config'
import { winnerOf } from '@/selectors'
import { TeamLogo } from './TeamLogo'

function ParticipantRow({ memberId, score, year, isWinner, subtitle }: { memberId: string; score: number; year: string; isWinner: boolean; subtitle?: string }) {
  return (
    <div
      className={`flex items-center justify-between gap-2 border-l-2 pl-2 ${
        isWinner ? 'border-accent font-semibold' : 'border-transparent text-muted'
      }`}
    >
      <span className="flex items-center gap-2 truncate">
        <TeamLogo ffuId={memberId} size={24} />
        <span className="truncate">{nameForYear(memberId, year) ?? memberId}</span>
        {subtitle && <span className="shrink-0 font-mono text-[11px] font-normal text-muted">{subtitle}</span>}
      </span>
      <span className="font-mono tabular-nums">{score.toFixed(2)}</span>
    </div>
  )
}

/** `subtitle`: small tag beside each team — its running record (regular season) or seed (playoffs). */
export function MatchupCard({ game, year, onOpen, subtitle }: { game: Game; year: string; onOpen?: () => void; subtitle?: (memberId: string) => string | undefined }) {
  const winner = winnerOf(game)
  const body = (
    <>
      {game.round && <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">{game.round}</div>}
      <div className="space-y-1">
        {game.participants.map((p) => (
          <ParticipantRow key={p.memberId} memberId={p.memberId} score={p.score} year={year} isWinner={p.memberId === winner} subtitle={subtitle?.(p.memberId)} />
        ))}
      </div>
    </>
  )
  const base = 'block w-full border border-border bg-surface p-3 text-left shadow-sm'
  if (!onOpen) return <div className={base}>{body}</div>
  return (
    <button type="button" onClick={onOpen} className={`${base} cursor-pointer transition-colors hover:border-accent hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}>
      {body}
      <span className="mt-2 block text-[10px] font-semibold uppercase tracking-wide text-muted">View lineups →</span>
    </button>
  )
}
