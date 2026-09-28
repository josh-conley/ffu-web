import type { PlayerMap } from '@/data'
import { playerSummaries, type PlayerAppearance, type PlayerSummary } from './playerAppearances'

/** How many franchise players the Members page shows. */
export const FRANCHISE_PLAYER_COUNT = 5

/**
 * The players a member leaned on most: the ones who put the most points on the board in THEIR
 * starting lineups (benched weeks don't count — see `playerAppearances`). Sleeper era only, like the
 * lineups it is built from. Reuses `playerSummaries`, so starts/points match the Players page's
 * accounting exactly, just narrowed to one manager.
 */
export function franchisePlayers(
  appearances: PlayerAppearance[],
  players: PlayerMap,
  memberId: string,
  count: number = FRANCHISE_PLAYER_COUNT,
): PlayerSummary[] {
  return playerSummaries(
    appearances.filter((a) => a.memberId === memberId),
    players,
  ).slice(0, count)
}
