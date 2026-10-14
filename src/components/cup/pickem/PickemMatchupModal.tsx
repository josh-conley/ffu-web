import { FaCheck } from 'react-icons/fa6'
import { nameForYear } from '@/config'
import type { Tier } from '@/config/types'
import type { SeasonData } from '@/data'
import { weekScore, type SeasonsByTier } from '@/selectors'
import { Dialog } from '../../Dialog'
import { LeagueBadge } from '../../LeagueBadge'
import { TeamLogo } from '../../TeamLogo'
import { segButton } from '../../controls'
import { teamAbbr } from '../../seriesText'
import { seedLabel } from '../../format'
import { CupGameBody } from '../CupMatchupModal'
import { PickemSeasonSnapshot } from './PickemSeasonSnapshot'

// One pick'em matchup, opened from the bracket: both teams up top with a Pick button under each,
// then this season side by side and both teams' lineups for the ROUND'S week (live from Sleeper
// while it's being played or still to come), so a member can decide without leaving the page.
// Read-only (no `onPick`) on the leaderboard, where it shows whose bracket picked whom.

export interface PickemMatchup {
  a: string
  b: string
  roundLabel: string
  /** The round's week: whose lineups and scores the box score shows. */
  week: number
  /** The team picked in this matchup so far, if any. */
  pick?: string
}

function TeamHead({ ffuId, tier, seed, year, picked, onPick }: {
  ffuId: string
  tier: Tier | undefined
  seed: number | undefined
  year: string
  picked: boolean
  onPick?: () => void
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
      <TeamLogo ffuId={ffuId} size={48} clickable={false} />
      <span className="max-w-full truncate text-sm font-extrabold uppercase tracking-tight sm:text-base">{nameForYear(ffuId, year) ?? ffuId}</span>
      <span className="inline-flex items-center gap-1.5">
        {seed !== undefined && <span className="font-mono text-xs font-semibold tabular-nums text-muted">{seedLabel(seed)}</span>}
        {tier && <LeagueBadge tier={tier} />}
      </span>
      {onPick ? (
        <button type="button" aria-pressed={picked} onClick={onPick} className={`${segButton(picked)} mt-1 justify-center gap-1.5`}>
          {picked && <FaCheck aria-hidden />}
          {picked ? 'Your pick' : `Pick ${teamAbbr(ffuId)}`}
        </button>
      ) : (
        picked && <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold uppercase text-accent"><FaCheck aria-hidden /> Picked</span>
      )}
    </div>
  )
}

export function PickemMatchupModal({ matchup, year, seasons, tierOf, seedOf, onPick, onClose }: {
  matchup: PickemMatchup
  year: string
  /** The Cup season's league files, for the season-so-far figures. */
  seasons: SeasonData[]
  tierOf: ReadonlyMap<string, Tier>
  seedOf: ReadonlyMap<string, number>
  /** Omit for a read-only view. Picking closes the modal. */
  onPick?: (ffuId: string) => void
  onClose: () => void
}) {
  const { a, b, roundLabel, week, pick } = matchup
  const byTier: SeasonsByTier = Object.fromEntries(seasons.map((s) => [s.tier, s]))
  const side = (id: string) => {
    const tier = tierOf.get(id) ?? 'NATIONAL'
    return { ffuId: id, tier, seed: seedOf.get(id), score: weekScore(byTier, tier, id, week) }
  }
  const head = (id: string) => (
    <TeamHead ffuId={id} tier={tierOf.get(id)} seed={seedOf.get(id)} year={year} picked={pick === id} onPick={onPick && (() => onPick(id))} />
  )
  return (
    <Dialog label={`${roundLabel}: ${teamAbbr(a)} v ${teamAbbr(b)}`} title={roundLabel} width="lg" onClose={onClose}>
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 border-b border-border px-3 py-4 sm:px-6">
        {head(a)}
        <span className="self-center pt-2 text-xs font-bold uppercase text-muted">vs</span>
        {head(b)}
      </div>
      <PickemSeasonSnapshot seasons={seasons} a={a} b={b} />
      <section className="border-t border-border">
        <h3 className="bg-surface-2/40 px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-widest text-muted">
          Week {week} lineups
        </h3>
        <CupGameBody game={{ year, week, a: side(a), b: side(b) }} />
      </section>
    </Dialog>
  )
}
