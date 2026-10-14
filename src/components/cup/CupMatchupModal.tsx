import type { FormOf } from '@/hooks/useFormGoingInto'
import { cupGameSource, type CupGameSide } from '@/selectors'
import { formLabel, seedLabel } from '../format'
import { LeagueBadge } from '../LeagueBadge'
import { LineupModalFrame } from '../LineupModalFrame'
import { LiveBoxScoreBody } from '../LiveBoxScoreBody'
import { StaticBoxScoreBody } from '../StaticBoxScoreBody'
import { teamAbbr } from '../seriesText'

/** One Cup game to open: the round it belongs to and its two teams. */
export interface CupGame {
  year: string
  week: number
  /** The round's name ("Round of 36"), for the title bar. */
  label: string
  a: CupGameSide
  b: CupGameSide
}

/** "Round of 36 · Week 6", then each team's league, since a Cup game can cross them. */
function Title({ game, live }: { game: CupGame; live: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span>
        {game.label} · Week {game.week}
        {live && ' · Live'}
      </span>
      <span className="inline-flex gap-1 normal-case">
        <LeagueBadge tier={game.a.tier} />
        <LeagueBadge tier={game.b.tier} />
      </span>
    </span>
  )
}

/**
 * Each team's seed, and its record and UPR going into the game where `form` knows them, either side
 * of the box score's team heads. Always shown: a Cup game always shows both seeds.
 */
export function CupSidesStrip({ a: sideA, b: sideB, form }: { a: CupGameSide; b: CupGameSide; form?: (ffuId: string) => string | undefined }) {
  const line = (side: CupGameSide) => [seedLabel(side.seed), teamAbbr(side.ffuId), form?.(side.ffuId)].filter(Boolean).join(' ')
  const [a, b] = [line(sideA), line(sideB)]
  const going = form !== undefined && (form(sideA.ffuId) !== undefined || form(sideB.ffuId) !== undefined)
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-2/40 px-2 py-1.5 font-mono text-[11px] tabular-nums text-muted sm:px-3 sm:text-xs">
      <span className="min-w-0 truncate">{a}</span>
      <span className="shrink-0 font-sans text-[10px] font-semibold uppercase tracking-wide">{going ? 'Going in' : 'vs'}</span>
      <span className="min-w-0 truncate text-right">{b}</span>
    </div>
  )
}

/**
 * A Cup game's box score, for ITS week (the round's), never just the latest one on file: each team's
 * lineup from its own league. A finished week reads the season's lineup files; the live season's
 * other weeks read Sleeper, as the home page does. Shared by the bracket's matchup modal and the
 * pick'em's, so both always show the round's week.
 */
export function CupGameBody({ game }: { game: Omit<CupGame, 'label'> }) {
  const { year, week, a, b } = game
  const source = cupGameSource(year, a, b)
  if (source?.kind === 'live') return <LiveBoxScoreBody game={{ leagueIds: source.leagueIds, year, week, memberIds: [a.ffuId, b.ffuId] }} />
  if (!source) return <p className="p-6 text-sm text-muted">This game hasn&apos;t been played yet.</p>
  return (
    <StaticBoxScoreBody
      year={year}
      week={week}
      sides={[
        { memberId: a.ffuId, tier: a.tier, score: source.scores[0] },
        { memberId: b.ffuId, tier: b.tier, score: source.scores[1] },
      ]}
    />
  )
}

/**
 * A Cup game's matchup modal: the same modal as a league game's (lineups, bench, the pair's series,
 * each team's profile), around CupGameBody, under both teams' seeds. `formOf` adds each team's
 * record and UPR going into the game beside its seed.
 */
export function CupMatchupModal({ game, formOf, onClose }: { game: CupGame; formOf?: FormOf; onClose: () => void }) {
  const live = cupGameSource(game.year, game.a, game.b)?.kind === 'live'
  return (
    <LineupModalFrame title={<Title game={game} live={live} />} memberIds={[game.a.ffuId, game.b.ffuId]} onClose={onClose}>
      <CupSidesStrip a={game.a} b={game.b} form={formOf && ((ffuId) => formLabel(formOf(ffuId, game.week)))} />
      <CupGameBody game={game} />
    </LineupModalFrame>
  )
}
