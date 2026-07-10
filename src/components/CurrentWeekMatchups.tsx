import type { Tier } from '@/config'
import type { Game, LiveSeasonData } from '@/data'
import { currentWeekMatchups } from '@/selectors'
import { LEAGUE_STYLES } from './leagues'
import { MatchupCard } from './MatchupCard'

export interface OpenGame {
  leagueId: string
  year: string
  game: Game
}

/** One tier's column of this week's matchups (live/in-progress scores, clickable for a box score).
 *  A solid tier-colored heading — same treatment as ChampionsByLeague's per-league card — so all
 *  three tiers read at a glance side by side. */
export function CurrentWeekMatchups({ tier, data, onOpen }: { tier: Tier; data: LiveSeasonData; onOpen: (open: OpenGame) => void }) {
  const style = LEAGUE_STYLES[tier]
  return (
    <section className="border border-border bg-surface shadow-sm">
      <h3 className={`px-3 py-2 text-sm font-bold uppercase tracking-wide ${style.solidHeader}`}>{style.label}</h3>
      <div className="space-y-2 p-2">
        {currentWeekMatchups(data).map((game) => (
          <MatchupCard
            key={game.participants.map((p) => p.memberId).join('-')}
            game={game}
            year={data.year}
            onOpen={() => onOpen({ leagueId: data.leagueId, year: data.year, game })}
          />
        ))}
      </div>
    </section>
  )
}
