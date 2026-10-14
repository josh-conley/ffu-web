import { CUP_ACCENT, CUP_NAME } from '@/config'
import type { LiveSeasonData } from '@/data'
import { cupMatchupGame, type ResolvedRound } from '@/selectors'
import type { OpenGame } from './CurrentWeekMatchups'
import { LEAGUE_STYLES } from './leagues'
import { MatchupCard } from './MatchupCard'
import { useLiveRecordDetail } from './useLiveRecordDetail'

/**
 * A Cup round on the home page's matchups: the same live cards as the league columns, in one block
 * under the Cup's own accent, since a Cup game pairs teams across the leagues. Each team's line
 * names its league ahead of its record and UPR (from its own league, as the league columns read).
 * A card opens the box score with each team's lineup from its own league.
 */
export function CupWeekMatchups({
  round,
  seasons,
  final,
  onOpen,
  projected,
}: {
  round: ResolvedRound
  /** The live season, every league: where each team's league, record and UPR are read from. */
  seasons: readonly LiveSeasonData[]
  /** The round's week is over (Tuesday's finals): the winners stand, and the week counts in the records. */
  final: boolean
  onOpen: (open: OpenGame) => void
  projected?: (memberId: string) => number | undefined
}) {
  const record = useLiveRecordDetail(seasons, final ? round.week : round.week - 1)
  const leagueOf = (tier: string) => seasons.find((s) => s.tier === tier)?.leagueId ?? ''
  const year = seasons[0]?.year ?? ''
  return (
    <section className="border bg-surface shadow-sm" style={{ borderColor: CUP_ACCENT }}>
      <h3 className="px-3 py-2 text-sm font-bold uppercase tracking-wide text-white" style={{ backgroundColor: CUP_ACCENT }}>
        {CUP_NAME} · {round.label}
      </h3>
      <div className="grid gap-2 p-2 sm:grid-cols-2 lg:grid-cols-3">
        {round.matchups.map((m) => {
          const game = cupMatchupGame(m, round.week)
          const tierOf = (ffuId: string) => (ffuId === m.a.ffuId ? m.a.tier : m.b.tier)
          const detail = (ffuId: string) => [LEAGUE_STYLES[tierOf(ffuId)].label, record(ffuId)].filter(Boolean).join(' · ')
          return (
            <MatchupCard
              key={`${m.a.ffuId}-${m.b.ffuId}`}
              game={game}
              year={year}
              status={final ? 'final' : 'live'}
              projected={final ? undefined : projected}
              detail={detail}
              onOpen={() =>
                onOpen({
                  leagueIds: [leagueOf(m.a.tier), leagueOf(m.b.tier)],
                  year,
                  game,
                  title: `${CUP_NAME} ${round.label} · Week ${round.week}${final ? '' : ' · Live'}`,
                })
              }
            />
          )
        })}
      </div>
    </section>
  )
}
