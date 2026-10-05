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

/** Season UPR and career average UPR — the quickest read on how the two teams match up. */
function Ratings({ rating }: { rating: DrawRating | undefined }) {
  return (
    <div className="flex gap-4 font-mono text-sm tabular-nums text-muted">
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

function Side({ side, rating, muted }: { side: MatchupSide; rating: DrawRating | undefined; muted?: boolean }) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-3 ${muted ? 'opacity-60' : ''}`}>
      <TeamLogo ffuId={side.ffuId} size={52} clickable={false} />
      <div className="min-w-0">
        <div className="truncate text-2xl font-extrabold uppercase tracking-tight sm:text-3xl">{side.name}</div>
        <div className={`text-sm font-bold uppercase tracking-widest ${LEAGUE_STYLES[side.tier].text}`}>
          {LEAGUE_STYLES[side.tier].label} · seed {side.seed}
        </div>
        <Ratings rating={rating} />
      </div>
    </div>
  )
}

/** An empty plate while the bowl is still spinning. */
function Pending() {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span className="size-13 shrink-0 animate-pulse bg-surface-2" aria-hidden />
      <span className="min-w-0 truncate text-2xl font-extrabold uppercase tracking-widest text-muted sm:text-3xl">Drawing…</span>
    </div>
  )
}

export function DrawMatchupCard({ drawer, drawn, forced, ratings, footer }: {
  drawer: MatchupSide
  /** Undefined while the spinner runs. */
  drawn: MatchupSide | undefined
  /** Only one team was left to draw. */
  forced: boolean
  /** Each team's current and all-time UPR, by ffuId. */
  ratings: Map<string, DrawRating>
  /** The storyline along the bottom; its strip is always reserved, so null just leaves it empty. */
  footer: ReactNode
}) {
  // The matchup number lives in the top bar only — it used to appear three times on one screen.
  const label = !drawn ? 'On the clock' : forced ? 'Last team in the bowl' : 'Drawn'
  return (
    <div
      role="group"
      aria-label="Current matchup"
      className="border-2 bg-surface px-4 py-3 shadow-sm"
      style={{ borderColor: CUP_ACCENT }}
    >
      <p className="mb-1 text-xs font-bold uppercase tracking-widest" style={{ color: CUP_ACCENT }}>
        {label}
      </p>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <Side side={drawer} rating={ratings.get(drawer.ffuId)} />
        <span className="shrink-0 text-center text-sm font-extrabold uppercase tracking-widest text-muted">v</span>
        {drawn ? <Side side={drawn} rating={ratings.get(drawn.ffuId)} /> : <Pending />}
      </div>
      {/* Always there, with its height reserved, so the card doesn't grow when the storyline arrives
          or shrink when the next matchup clears it. */}
      <div data-story-strip className="mt-2 flex min-h-9 items-center border-t border-border pt-2">
        {footer}
      </div>
    </div>
  )
}
