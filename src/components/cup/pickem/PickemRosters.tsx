import type { Tier } from '@/config/types'
import type { PlayerMap, PlayerRef } from '@/data'
import { useLineups, usePlayers } from '@/hooks/useLeagueData'
import { latestRoster, type RosterSpot } from '@/selectors'
import { shortPlayerName } from '../../format'
import { posClass } from '../../positions'
import { teamAbbr } from '../../seriesText'

// Both teams' rosters side by side, each from its own league's latest lineup on file (latestRoster).
// Lineup files load only when a modal opens, and each league's is fetched once and shared.

/** Team defenses keep their full name ("New England Patriots", not "N. England Patriots"). */
const displayName = (p: PlayerRef) => (p.position === 'DEF' ? p.name : shortPlayerName(p.name))

function Spot({ spot, players, divided }: { spot: RosterSpot; players: PlayerMap | undefined; divided: boolean }) {
  const player = players?.[spot.playerId]
  const name = player ? displayName(player) : spot.playerId
  const starter = spot.slot !== 'BN' && spot.slot !== 'IR'
  // A starter shows the slot it filled; a bench or IR player, their position.
  const badge = starter ? spot.slot : (player?.position ?? spot.slot)
  return (
    <li className={`flex items-center gap-1.5 py-0.5 ${starter ? '' : 'text-muted'} ${divided ? 'mt-1 border-t border-border pt-1' : ''}`}>
      <span className={`w-11 shrink-0 px-1 text-center text-[10px] font-bold ${posClass(badge)}`}>{badge}</span>
      <span className="min-w-0 truncate">{name}</span>
      {player?.team && <span className="shrink-0 text-[10px] text-muted">{player.team}</span>}
      {spot.slot === 'IR' && <span className="shrink-0 text-[10px] font-bold text-negative">IR</span>}
    </li>
  )
}

function TeamRoster({ ffuId, tier, year, players }: { ffuId: string; tier: Tier; year: string; players: PlayerMap | undefined }) {
  const lineups = useLineups(tier, year)
  if (lineups.loading) return <p className="text-xs text-muted">Loading roster…</p>
  const roster = lineups.data ? latestRoster(lineups.data, ffuId) : undefined
  if (!roster) return <p className="text-xs text-muted">No lineup on file yet.</p>
  const firstBench = roster.spots.findIndex((s) => s.slot === 'BN' || s.slot === 'IR')
  return (
    <div className="min-w-0">
      <h4 className="mb-1 truncate text-[11px] font-bold uppercase tracking-wide">
        {teamAbbr(ffuId)} <span className="font-normal normal-case text-muted">· week {roster.week} lineup</span>
      </h4>
      <ul className="text-xs">
        {roster.spots.map((s, i) => (
          <Spot key={`${s.playerId}-${i}`} spot={s} players={players} divided={i === firstBench} />
        ))}
      </ul>
    </div>
  )
}

export function PickemRosters({ a, b, tierOf, year }: { a: string; b: string; tierOf: ReadonlyMap<string, Tier>; year: string }) {
  const players = usePlayers()
  return (
    <section className="border-t border-border px-2 py-3 sm:px-4">
      <h3 className="mb-2 text-center text-[11px] font-bold uppercase tracking-widest text-muted">Rosters</h3>
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        {[a, b].map((id) => (
          <TeamRoster key={id} ffuId={id} tier={tierOf.get(id) ?? 'NATIONAL'} year={year} players={players.data} />
        ))}
      </div>
    </section>
  )
}
