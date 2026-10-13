import type { ReactNode } from 'react'
import { CUP_ACCENT } from '@/config'
import type { CupTier } from '@/lib/cupDraw.mjs'
import type { DrawRating } from '@/selectors'
import { LEAGUE_STYLES } from '../../leagues'
import { TeamLogo } from '../../TeamLogo'

// The centre of the stage: who is drawing, and who they got.

export interface MatchupSide {
  ffuId: string
  name: string
  tier: CupTier
  seed: number
}

const uprText = (n: number | undefined) => (n === undefined ? '—' : n.toFixed(1))

/** Record, season UPR and career average UPR — the quickest read on how the two teams match up. */
function Ratings({ rating, record }: { rating: DrawRating | undefined; record: string | undefined }) {
  return (
    <div className="flex flex-wrap gap-x-4 font-mono text-sm tabular-nums leading-tight text-muted">
      <span>
        <span className="font-sans text-xs font-bold uppercase tracking-widest">Record </span>
        <span className="font-bold text-text">{record ?? '—'}</span>
      </span>
      <span>
        <span className="font-sans text-xs font-bold uppercase tracking-widest">Season UPR </span>
        <span className="font-bold text-text">{uprText(rating?.current)}</span>
      </span>
      <span>
        <span className="font-sans text-xs font-bold uppercase tracking-widest">Career Avg UPR </span>
        <span className="font-bold text-text">{uprText(rating?.allTime)}</span>
      </span>
    </div>
  )
}

/**
 * One team: crest, name, and a single line under it with league, seed, record and both UPRs. One
 * line rather than two so the card stays short: the whole bracket has to fit below it on the call.
 */
function Side({ side, rating, record, muted }: { side: MatchupSide; rating: DrawRating | undefined; record: string | undefined; muted?: boolean }) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-3 ${muted ? 'opacity-60' : ''}`}>
      <TeamLogo ffuId={side.ffuId} size={40} clickable={false} />
      <div className="min-w-0">
        <div className="truncate text-xl font-extrabold uppercase leading-tight tracking-tight sm:text-2xl">{side.name}</div>
        <div className="flex flex-wrap items-baseline gap-x-4">
          <span className={`text-xs font-bold uppercase tracking-widest ${LEAGUE_STYLES[side.tier].text}`}>
            {LEAGUE_STYLES[side.tier].label} · seed {side.seed}
          </span>
          <Ratings rating={rating} record={record} />
        </div>
      </div>
    </div>
  )
}

/** An empty plate while the bowl is still spinning. */
function Pending() {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span className="size-10 shrink-0 animate-pulse bg-surface-2" aria-hidden />
      <span className="min-w-0 truncate text-xl font-extrabold uppercase tracking-widest text-muted sm:text-2xl">Drawing…</span>
    </div>
  )
}

export function DrawMatchupCard({ drawer, drawn, forced, ratings, recordOf, footer }: {
  drawer: MatchupSide
  /** Undefined while the spinner runs. */
  drawn: MatchupSide | undefined
  /** Only one team was left to draw. */
  forced: boolean
  /** Each team's current and all-time UPR, by ffuId. */
  ratings: Map<string, DrawRating>
  /** Each team's record this season so far, by ffuId. */
  recordOf?: (ffuId: string) => string | undefined
  /** The storyline along the bottom; its strip is always reserved, so null just leaves it empty. */
  footer: ReactNode
}) {
  // The matchup number lives in the top bar only — it used to appear three times on one screen.
  const label = !drawn ? 'On the clock' : forced ? 'Last team in the bowl' : 'Drawn'
  return (
    <div
      role="group"
      aria-label="Current matchup"
      className="border-2 bg-surface px-4 py-2 shadow-sm"
      style={{ borderColor: CUP_ACCENT }}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: CUP_ACCENT }}>
        {label}
      </p>
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
        <Side side={drawer} rating={ratings.get(drawer.ffuId)} record={recordOf?.(drawer.ffuId)} />
        <span className="shrink-0 text-center text-sm font-extrabold uppercase tracking-widest text-muted">v</span>
        {drawn ? <Side side={drawn} rating={ratings.get(drawn.ffuId)} record={recordOf?.(drawn.ffuId)} /> : <Pending />}
      </div>
      {/* Always there, with its height reserved, so the card doesn't grow when the storyline arrives
          or shrink when the next matchup clears it. */}
      <div data-story-strip className="mt-1.5 flex min-h-7 items-center border-t border-border pt-1.5">
        {footer}
      </div>
    </div>
  )
}
