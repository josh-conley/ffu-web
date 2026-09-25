import type { PlayerLiveStatus } from '@/selectors'

// Where a player's NFL game stands, as a dot beside their name in a live box score: filled green
// and pulsing while it's on, a hollow ring before kickoff, a faded dot once it's over. No dot when
// they have no game this week (bye) — there's nothing to report. The legend below spells it out.

const LABEL: Record<Exclude<PlayerLiveStatus, 'idle'>, string> = { live: 'Playing now', pre: 'Yet to play', final: 'Played' }
// The key also shows the dash a player yet to play gets for points (see liveStatusTone.ts).
const KEY: Record<Exclude<PlayerLiveStatus, 'idle'>, string> = { live: 'Playing now', pre: 'Yet to play (—)', final: 'Played' }
const STYLE: Record<Exclude<PlayerLiveStatus, 'idle'>, string> = {
  live: 'bg-positive motion-safe:animate-pulse',
  pre: 'border border-muted',
  final: 'bg-muted/40',
}

function Dot({ status, decorative }: { status: Exclude<PlayerLiveStatus, 'idle'>; decorative?: boolean }) {
  const className = `inline-block size-1.5 shrink-0 rounded-full sm:size-2 ${STYLE[status]}`
  if (decorative) return <span aria-hidden="true" className={className} />
  return <span role="img" aria-label={LABEL[status]} title={LABEL[status]} className={className} />
}

export function LiveStatusDot({ status }: { status: PlayerLiveStatus | undefined }) {
  if (status === undefined || status === 'idle') return null
  return <Dot status={status} />
}

export function LiveStatusLegend() {
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-border px-3 py-2 text-[11px] text-muted">
      {(['live', 'pre', 'final'] as const).map((status) => (
        <span key={status} className="flex items-center gap-1.5">
          <Dot status={status} decorative />
          {KEY[status]}
        </span>
      ))}
    </p>
  )
}
