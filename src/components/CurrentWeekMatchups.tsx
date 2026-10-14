import { useMemo } from 'react'
import type { Tier } from '@/config'
import type { Game, LiveSeasonData } from '@/data'
import { currentWeekMatchups } from '@/selectors'
import { LEAGUE_STYLES } from './leagues'
import { MatchupCard } from './MatchupCard'
import { useLiveRecordDetail } from './useLiveRecordDetail'

export interface OpenGame {
  /** Each team's league, in the game's participant order (two different ones for a Cup game). */
  leagueIds: readonly [string, string]
  year: string
  game: Game
  /** The box score's title bar, when not the default "Week N · Live" (the Cup names its round). */
  title?: string
}

/** One tier's column of this week's matchups (in progress, so styled live: no winner until the
 *  weekly refresh files it; clickable for a box score).
 *  A solid tier-colored heading — same treatment as ChampionsByLeague's per-league card — so all
 *  three tiers read at a glance side by side. `projected` adds each team's projected final score. */
export function CurrentWeekMatchups({
  tier,
  data,
  onOpen,
  projected,
  final = false,
}: {
  tier: Tier
  data: LiveSeasonData
  onOpen: (open: OpenGame) => void
  projected?: (memberId: string) => number | undefined
  /** The week on show is finished (Tuesday's finals): its own result counts in the records. */
  final?: boolean
}) {
  const style = LEAGUE_STYLES[tier]
  // Record and UPR (PPG until the season has a UPR) through the last completed week, the same
  // numbers as the home standings and the Standings page. A final week is itself completed.
  const through = final ? data.currentWeek : data.currentWeek - 1
  const detail = useLiveRecordDetail(useMemo(() => [data], [data]), through)
  return (
    <section className="border border-border bg-surface shadow-sm">
      <h3 className={`px-3 py-2 text-sm font-bold uppercase tracking-wide ${style.solidHeader}`}>{style.label}</h3>
      <div className="space-y-2 p-2">
        {currentWeekMatchups(data).map((game) => (
          <MatchupCard
            key={game.participants.map((p) => p.memberId).join('-')}
            game={game}
            year={data.year}
            status="live"
            projected={projected}
            detail={detail}
            onOpen={() => onOpen({ leagueIds: [data.leagueId, data.leagueId], year: data.year, game })}
          />
        ))}
      </div>
    </section>
  )
}
