import { CUP_ACCENT } from '@/config'
import type { BowlSlot } from '@/selectors'
import { LEAGUE_STYLES } from '../../leagues'
import { TeamLogo } from '../../TeamLogo'

// The running order beside the track. Real marble-race broadcasts lean on this: 24 small marbles
// are hard to follow at 720p, but a list with the leader on top reads at a glance.

export function RaceLeaderboard({ order, finished }: { order: BowlSlot[]; finished: number }) {
  return (
    <ol className="space-y-1 self-start" aria-label="Running order">
      {order.map((team, place) => {
        const leading = place === 0
        return (
          <li
            key={team.ffuId}
            className="flex items-center gap-2 border px-2 py-1 text-sm"
            style={{ borderColor: leading ? CUP_ACCENT : 'var(--color-border)', borderWidth: leading ? 2 : 1 }}
          >
            <span className="w-5 shrink-0 text-right font-mono font-bold tabular-nums text-muted">{place + 1}</span>
            <TeamLogo ffuId={team.ffuId} size={22} clickable={false} />
            <span className={`min-w-0 flex-1 truncate ${leading ? 'font-extrabold' : 'font-semibold'}`}>{team.name}</span>
            {place < finished ? (
              <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: CUP_ACCENT }}>
                {place === 0 ? 'Wins' : 'In'}
              </span>
            ) : (
              <span className={`size-2 shrink-0 rounded-full ${LEAGUE_STYLES[team.tier].dot}`} aria-hidden />
            )}
          </li>
        )
      })}
    </ol>
  )
}
