import { useState } from 'react'
import { CUP_ACCENT, CUP_NAME, getPrizeSchedule, isCupRoundKey } from '@/config'
import type { LiveSeasonData } from '@/data'
import { cupMatchupGame, type ResolvedMatchup, type ResolvedRound, type ResolvedSide } from '@/selectors'
import { CupSidesStrip } from './cup/CupMatchupModal'
import { seedLabel } from './format'
import { LEAGUE_STYLES } from './leagues'
import { LiveLineupModal } from './LiveLineupModal'
import { MatchupCard } from './MatchupCard'
import { useLiveRecordDetail } from './useLiveRecordDetail'

/** The round whose lowest-scoring winner is culled: say so up front, since that win doesn't pay. */
function DropNote({ round, year }: { round: ResolvedRound; year: string }) {
  const prize = isCupRoundKey(round.key) ? getPrizeSchedule(year)?.cup?.[round.key] : undefined
  return (
    <p className="border-b border-border px-3 py-2 text-xs text-muted">
      The lowest-scoring winner this round is eliminated and does <strong className="text-text">not</strong> collect
      {prize === undefined ? ' the round\'s prize' : ` the $${prize}`}: prizing is for winning <em>and</em> advancing.
    </p>
  )
}

/** A team's league as a colored dot (named for screen readers only), then its draw seed. */
function CupSideTag({ side }: { side: ResolvedSide }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`size-2 shrink-0 rounded-full ${LEAGUE_STYLES[side.tier].dot}`} aria-hidden />
      <span className="sr-only">{LEAGUE_STYLES[side.tier].label}, seed </span>
      {seedLabel(side.seed)}
    </span>
  )
}

/**
 * A Cup round on the home page's matchups: the same live cards as the league columns, in one block
 * under the Cup's own accent, since a Cup game pairs teams across the leagues. Each team shows its
 * league's colored dot and its draw seed beside its name (the dot, not the league's name, as on the
 * bracket), and its record and UPR under it (from its own league, as the league columns read). A card opens the box score, read live from Sleeper like the league
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
      {round.dropsLowestWinner && <DropNote round={round} year={year} />}
      <div className="grid gap-2 p-2 sm:grid-cols-2 lg:grid-cols-3">
        {round.matchups.map((m) => {
          const sideOf = (ffuId: string) => (ffuId === m.a.ffuId ? m.a : m.b)
          return (
            <MatchupCard
              key={`${m.a.ffuId}-${m.b.ffuId}`}
              game={cupMatchupGame(m, round.week)}
              year={year}
              status={final ? 'final' : 'live'}
              subtitle={(ffuId) => <CupSideTag side={sideOf(ffuId)} />}
              projected={final ? undefined : projected}
              detail={record}
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
