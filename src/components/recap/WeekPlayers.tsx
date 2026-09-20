import { nameForYear } from '@/config'
import type { BenchRegret, WeekPlayer } from '@/selectors'
import { LEAGUE_STYLES } from '../leagues'
import { posClass } from '../positions'
import { TeamLogo } from '../TeamLogo'
import { RecapPanel } from './RecapPanel'

/**
 * The week's player stories: the best start in the Union, and the points the rest left on the
 * bench.
 *
 * Both blocks name the MANAGER as well as the player — a fantasy recap is about who started them,
 * and the bench block is only funny because it has a name on it.
 */

function PlayerRow({ player, year }: { player: WeekPlayer; year: string }) {
  const style = LEAGUE_STYLES[player.tier]
  return (
    <div className="flex min-w-0 items-center gap-2 px-3 py-2">
      <span aria-hidden className={`h-8 w-1 shrink-0 ${style.dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`shrink-0 px-1 text-[10px] font-bold uppercase ${posClass(player.position)}`}>
            {player.position}
          </span>
          <span className="truncate text-sm font-bold leading-tight">{player.name}</span>
          {player.nflTeam !== undefined && (
            <span className="shrink-0 text-[11px] font-semibold uppercase text-muted">{player.nflTeam}</span>
          )}
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
          <TeamLogo ffuId={player.memberId} size={16} />
          <span className="truncate text-[11px] text-muted">{nameForYear(player.memberId, year) ?? player.memberId}</span>
          <span className={`shrink-0 text-[11px] font-bold uppercase tracking-wider ${style.text}`}>{style.label}</span>
        </div>
      </div>
      <span className="shrink-0 font-mono text-base font-bold tabular-nums">{player.points.toFixed(2)}</span>
    </div>
  )
}

export function WeekPlayerHighs({
  players,
  year,
  week,
  compact,
  copyFilename,
}: {
  players: WeekPlayer[]
  year: string
  week: number | undefined
  compact: boolean
  copyFilename?: string
}) {
  return (
    <RecapPanel
      title="Players of the Week"
      meta={week ? `${year} · Week ${week}` : year}
      compact={compact}
      copyFilename={copyFilename}
    >
      {players.length === 0 ? (
        <p className="p-4 text-sm text-muted">No lineups on file for this week.</p>
      ) : (
        <div className={compact ? 'flex flex-col gap-px bg-border' : 'divide-y divide-border p-2'}>
          {players.map((player) => (
            <div key={`${player.memberId}-${player.playerId}`} className="bg-surface">
              <PlayerRow player={player} year={year} />
            </div>
          ))}
        </div>
      )}
    </RecapPanel>
  )
}

function RegretRow({ regret, year }: { regret: BenchRegret; year: string }) {
  const style = LEAGUE_STYLES[regret.tier]
  return (
    <div className="flex min-w-0 items-center gap-2 bg-surface px-3 py-2">
      <span aria-hidden className={`h-8 w-1 shrink-0 ${style.dot}`} />
      <TeamLogo ffuId={regret.memberId} size={24} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold leading-tight">
          {nameForYear(regret.memberId, year) ?? regret.memberId}
        </div>
        <div className="truncate text-[11px] leading-tight text-muted">
          {regret.worstCall === undefined
            ? `${regret.actual.toFixed(2)} of a possible ${regret.optimal.toFixed(2)}`
            : `${regret.worstCall.name} (${regret.worstCall.position}) scored ${regret.worstCall.points.toFixed(2)} on the bench`}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-mono text-base font-bold leading-tight tabular-nums text-negative">
          −{regret.lost.toFixed(2)}
        </div>
        <div className="font-mono text-[11px] leading-tight tabular-nums text-muted">
          {regret.actual.toFixed(1)}/{regret.optimal.toFixed(1)}
        </div>
      </div>
    </div>
  )
}

export function WeekBenchRegrets({
  regrets,
  year,
  week,
  compact,
  copyFilename,
}: {
  regrets: BenchRegret[]
  year: string
  week: number | undefined
  compact: boolean
  copyFilename?: string
}) {
  return (
    <RecapPanel
      title="Left on the Bench"
      meta={week ? `${year} · Week ${week}` : year}
      compact={compact}
      copyFilename={copyFilename}
    >
      {regrets.length === 0 ? (
        <p className="p-4 text-sm text-muted">Nobody left anything behind — or no lineups on file.</p>
      ) : (
        <div className={compact ? 'flex flex-col gap-px bg-border' : 'space-y-2 p-2'}>
          {regrets.map((regret) => (
            <RegretRow key={`${regret.tier}-${regret.memberId}`} regret={regret} year={year} />
          ))}
        </div>
      )}
    </RecapPanel>
  )
}
