import { useEffect, useMemo, useState } from 'react'
import { CUP_YEAR } from '@/config'
import type { SeasonData } from '@/data'
import { bracketSlots, drawCheckCode, drawCup, type CupField } from '@/lib/cupDraw.mjs'
import { formatDrawCsv, formatDrawSheet } from '@/lib/drawSheet.mjs'
import { cupGameSource, matchupStory, matchupTag, type DrawRating, type RoundOutline } from '@/selectors'
import { SPIN_MS, TOTAL_MATCHUPS, useCupDrawReveal } from '@/hooks/useCupDrawReveal'
import { useFormGoingInto, type FormOf } from '@/hooks/useFormGoingInto'
import { useSpaceToAdvance } from '@/hooks/useSpaceToAdvance'
import { DrawBracket, type SlotSeeds } from './DrawBracket'
import { DrawComplete } from './DrawComplete'
import { DrawControls, MuteButton, RestartButton } from './DrawControls'
import { DrawMatchupCard } from './DrawMatchupCard'
import { DrawReel } from './DrawReel'
import { DrawTopBar } from './DrawTopBar'
import { MatchupStoryLine } from './MatchupStoryLine'
import { downloadText } from './downloads'
import { recordLabel } from '../../format'
import { CupMatchupModal } from '../CupMatchupModal'
import type { LedgerMatchup } from './DrawBracketSlots'

// The stage. Built for a stream: the operator drives it with the space bar (nothing to see on
// camera), type is large, and the seed stays on screen throughout as proof it was fixed up front.
// Below the spinner, the two-sided Cup bracket's opening round fills in as each matchup is drawn.

/**
 * The matchup on the stage: nameplates, the reel, then the storyline. Every part keeps its place
 * for the whole matchup — the reel stays up, and the storyline has a reserved slot — so nothing on
 * the stage jumps as a matchup moves from on the clock to drawn.
 */
function CurrentMatchup({ reveal, story, ratings, recordOf, muted }: {
  reveal: ReturnType<typeof useCupDrawReveal>
  story: ReturnType<typeof matchupStory> | undefined
  ratings: Map<string, DrawRating>
  recordOf: (ffuId: string) => string | undefined
  muted: boolean
}) {
  const { drawer, drawn, phase, landing } = reveal
  if (!drawer) return null
  const revealed = phase === 'shown' || phase === 'done'
  return (
    <div className="space-y-2">
      <DrawMatchupCard
        drawer={drawer}
        drawn={landing ? undefined : drawn}
        forced={reveal.forced}
        ratings={ratings}
        recordOf={recordOf}
        // Always a strip, empty until there is a story: the card must not grow or shrink between draws.
        footer={story && drawn && !landing ? <MatchupStoryLine story={story} aName={drawer.name} bName={drawn.name} /> : null}
      />
      <DrawReel
        key={reveal.matchupNumber}
        pool={reveal.spinPool}
        winnerId={phase === 'ready' ? undefined : reveal.spinWinner}
        durationMs={SPIN_MS}
        muted={muted}
        motion={phase === 'spinning' || landing ? 'spin' : 'still'}
        landed={revealed}
      />
    </div>
  )
}

const NO_RATINGS = new Map<string, DrawRating>()

/**
 * Each team's record and UPR going into the opening round, from this season's games: its UPR under
 * its name in the bracket, its record on the card as it is drawn, both atop the matchup modal.
 */
function useOpeningForm(seasons: SeasonData[], opening: RoundOutline | undefined) {
  const thisSeason = useMemo(() => seasons.filter((s) => s.year === CUP_YEAR), [seasons])
  const week = opening?.week ?? 1
  const formOf = useFormGoingInto(thisSeason, [week])
  const teamForm = (ffuId: string) => formOf(ffuId, week)
  const recordOf = (ffuId: string) => {
    const form = teamForm(ffuId)
    return form && recordLabel(form.totals)
  }
  // A draw replayed for a season with no games on file has nothing to show, so its slots stay compact.
  return { formOf, teamForm: thisSeason.length > 0 ? teamForm : undefined, recordOf }
}

/**
 * A drawn matchup opened from the bracket: its opening-round game, as a matchup modal. Open only
 * while the season is live (before week 6 Sleeper already has both lineups for it); a draw replayed
 * for an old season has no lineups to show, so its slots stay plain.
 */
function useDrawnGame(opening: RoundOutline | undefined, ledger: LedgerMatchup[], formOf: FormOf) {
  const [index, setIndex] = useState<number | null>(null)
  const first = ledger[0]
  // Every opening game is the same week of the same season, so one answers for all of them.
  const openable = opening !== undefined && first !== undefined && cupGameSource(CUP_YEAR, first.a, first.b) !== undefined
  const open = index === null ? undefined : ledger[index]
  const modal = open && opening && (
    <CupMatchupModal game={{ year: CUP_YEAR, week: opening.week, label: opening.label, a: open.a, b: open.b }} formOf={formOf} onClose={() => setIndex(null)} />
  )
  return { onOpen: openable ? setIndex : undefined, modal }
}

export function DrawStage({ field, rounds, seed, seasons, ratings = NO_RATINGS, onRestart, resumeAt = 0, onProgress }: {
  field: CupField
  /** The season's rounds, for the bracket's shape. */
  rounds: RoundOutline[]
  seed: string
  /** Completed seasons, for each matchup's head-to-head story. Empty just hides the storyline. */
  seasons: SeasonData[]
  /** Each team's current and all-time UPR. Empty shows dashes. */
  ratings?: Map<string, DrawRating>
  onRestart: () => void
  /** Matchups already shown, when resuming a draw after a reload. */
  resumeAt?: number
  /** Told how many matchups are on screen after each step, so the page can make it resumable. */
  onProgress?: (settled: number) => void
}) {
  // Decided once, here, before anything is shown. The reveal below is presentation over a result
  // that already exists — the animation cannot change who was drawn.
  const result = useMemo(() => drawCup(field, seed), [field, seed])
  const reveal = useCupDrawReveal(field, result, resumeAt)
  const order = useMemo(() => bracketSlots(result), [result])
  // Every matchup's two seeds, drawing team's first — fixed by the draw rules before anything is shown.
  const seeds = useMemo(() => {
    const seedOf = new Map(result.participants.map((p) => [p.ffuId, p.seed]))
    return result.matchups.map((m): SlotSeeds => [seedOf.get(m.a) ?? 0, seedOf.get(m.b) ?? 0])
  }, [result])
  const { advance, drawer, drawn, settled } = reveal
  // Sound is on by default: this is an operator view for a broadcast, not a page anyone stumbles on.
  const [muted, setMuted] = useState(false)

  const opening = useOpeningForm(seasons, rounds[0])
  const drawnGame = useDrawnGame(rounds[0], reveal.ledger, opening.formOf)

  useSpaceToAdvance(advance)
  useEffect(() => onProgress?.(settled), [onProgress, settled])

  const story = useMemo(
    () => (drawer && drawn && seasons.length > 0 ? matchupStory(seasons, drawer.ffuId, drawn.ffuId) : undefined),
    [seasons, drawer, drawn],
  )

  // Head-to-head tags for the finished bracket (the FFUN screenshot); not needed until the end.
  const tags = useMemo(
    () =>
      reveal.done && seasons.length > 0
        ? reveal.ledger.map((m) => matchupTag(matchupStory(seasons, m.a.ffuId, m.b.ffuId)))
        : [],
    [reveal.done, reveal.ledger, seasons],
  )

  const lastShown = reveal.phase === 'shown' && reveal.matchupNumber === TOTAL_MATCHUPS
  const buttonLabel =
    reveal.phase === 'spinning' ? 'Reveal' : lastShown ? 'Show all matchups' : reveal.phase === 'shown' ? 'Next matchup' : 'Draw'

  const download = (kind: 'txt' | 'csv') =>
    kind === 'csv'
      ? downloadText(`ffu-cup-draw-${seed}.csv`, formatDrawCsv(field, result, seed), 'text/csv')
      : downloadText(`ffu-cup-draw-${seed}.txt`, formatDrawSheet(field, result, seed), 'text/plain')

  return (
    <div className="space-y-3">
      <DrawTopBar
        seed={seed}
        matchupNumber={reveal.matchupNumber}
        done={reveal.done}
        controls={<DrawControls done={reveal.done} label={buttonLabel} onAdvance={advance} />}
        tools={<MuteButton muted={muted} onToggle={() => setMuted((m) => !m)} />}
      />
      {reveal.done ? (
        <DrawComplete seed={seed} checkCode={drawCheckCode(result)} onDownload={download}>
          <DrawBracket rounds={rounds} order={order} seeds={seeds} matchups={reveal.ledger} tags={tags} onOpen={drawnGame.onOpen} formOf={opening.teamForm} />
        </DrawComplete>
      ) : (
        <>
          {/* Stacked: the spinner gets the full width (squeezed beside the bracket, names and the
              reel were cut off), and the two-sided bracket is short enough to sit under it. */}
          <CurrentMatchup reveal={reveal} story={story} ratings={ratings} recordOf={opening.recordOf} muted={muted} />
          <DrawBracket
            rounds={rounds}
            order={order}
            seeds={seeds}
            matchups={reveal.ledger}
            cursor={drawer && { index: reveal.matchupNumber - 1, drawer, drawn: reveal.landing ? undefined : drawn }}
            onOpen={drawnGame.onOpen}
            formOf={opening.teamForm}
          />
        </>
      )}
      <RestartButton drawnAny={settled > 0} onRestart={onRestart} />
      {drawnGame.modal}
    </div>
  )
}
