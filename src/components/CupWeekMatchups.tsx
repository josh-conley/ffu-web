import { useState } from 'react'
import { CUP_ACCENT, CUP_NAME } from '@/config'
import type { LiveSeasonData } from '@/data'
import { cupMatchupGame, type ResolvedMatchup, type ResolvedRound } from '@/selectors'
import { CupSidesStrip } from './cup/CupMatchupModal'
import { seedLabel } from './format'
import { LEAGUE_STYLES } from './leagues'
import { LiveLineupModal } from './LiveLineupModal'
import { MatchupCard } from './MatchupCard'
import { useLiveRecordDetail } from './useLiveRecordDetail'

/**
 * A Cup round on the home page's matchups: the same live cards as the league columns, in one block
 * under the Cup's own accent, since a Cup game pairs teams across the leagues. Each team shows its
 * draw seed beside its name, and its league ahead of its record and UPR (from its own league, as
 * the league columns read). A card opens the box score, read live from Sleeper like the league
 * games' (the season files only gain the week at Tuesday's refresh), each team's lineup from its
 * own league, under both seeds.
 */
export function CupWeekMatchups({
  round,
  seasons,
  final,
  projected,
}: {
  round: ResolvedRound
  /** The live season, every league: where each team's league, record and UPR are read from. */
  seasons: readonly LiveSeasonData[]
  /** The round's week is over (Tuesday's finals): the winners stand, and the week counts in the records. */
  final: boolean
  projected?: (memberId: string) => number | undefined
}) {
  const [open, setOpen] = useState<ResolvedMatchup | null>(null)
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
          const sideOf = (ffuId: string) => (ffuId === m.a.ffuId ? m.a : m.b)
          const detail = (ffuId: string) => [LEAGUE_STYLES[sideOf(ffuId).tier].label, record(ffuId)].filter(Boolean).join(' · ')
          return (
            <MatchupCard
              key={`${m.a.ffuId}-${m.b.ffuId}`}
              game={cupMatchupGame(m, round.week)}
              year={year}
              status={final ? 'final' : 'live'}
              subtitle={(ffuId) => seedLabel(sideOf(ffuId).seed)}
              projected={final ? undefined : projected}
              detail={detail}
              onOpen={() => setOpen(m)}
            />
          )
        })}
      </div>
      {open && (
        <LiveLineupModal
          leagueIds={[leagueOf(open.a.tier), leagueOf(open.b.tier)]}
          year={year}
          week={round.week}
          memberIds={[open.a.ffuId, open.b.ffuId]}
          scoreOf={(ffuId) => (ffuId === open.a.ffuId ? open.a.score : open.b.score)}
          title={`${CUP_NAME} ${round.label} · Week ${round.week}${final ? '' : ' · Live'}`}
          lead={<CupSidesStrip a={open.a} b={open.b} form={record} />}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  )
}
