import { FaCheck } from 'react-icons/fa6'
import { nameForYear } from '@/config'
import type { Tier } from '@/config/types'
import type { SeasonData } from '@/data'
import { Dialog } from '../../Dialog'
import { LeagueBadge } from '../../LeagueBadge'
import { TeamLogo } from '../../TeamLogo'
import { segButton } from '../../controls'
import { teamAbbr } from '../../seriesText'
import { PickemRosters } from './PickemRosters'
import { PickemSeasonSnapshot } from './PickemSeasonSnapshot'

// One pick'em matchup, opened from the bracket: both teams up top with a Pick button under each,
// then this season side by side and both rosters, so a member can decide without leaving the page.
// Read-only (no `onPick`) on the leaderboard, where it shows whose bracket picked whom.

export interface PickemMatchup {
  a: string
  b: string
  roundLabel: string
  /** The team picked in this matchup so far, if any. */
  pick?: string
}

function TeamHead({ ffuId, tier, year, picked, onPick }: {
  ffuId: string
  tier: Tier | undefined
  year: string
  picked: boolean
  onPick?: () => void
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
      <TeamLogo ffuId={ffuId} size={48} clickable={false} />
      <span className="max-w-full truncate text-sm font-extrabold uppercase tracking-tight sm:text-base">{nameForYear(ffuId, year) ?? ffuId}</span>
      {tier && <LeagueBadge tier={tier} />}
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

export function PickemMatchupModal({ matchup, year, seasons, tierOf, onPick, onClose }: {
  matchup: PickemMatchup
  year: string
  /** The Cup season's league files, for the season-so-far figures. */
  seasons: SeasonData[]
  tierOf: ReadonlyMap<string, Tier>
  /** Omit for a read-only view. Picking closes the modal. */
  onPick?: (ffuId: string) => void
  onClose: () => void
}) {
  const { a, b, roundLabel, pick } = matchup
  const head = (id: string) => (
    <TeamHead ffuId={id} tier={tierOf.get(id)} year={year} picked={pick === id} onPick={onPick && (() => onPick(id))} />
  )
  return (
    <Dialog label={`${roundLabel}: ${teamAbbr(a)} v ${teamAbbr(b)}`} title={roundLabel} width="lg" onClose={onClose}>
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 border-b border-border px-3 py-4 sm:px-6">
        {head(a)}
        <span className="self-center pt-2 text-xs font-bold uppercase text-muted">vs</span>
        {head(b)}
      </div>
      <PickemSeasonSnapshot seasons={seasons} a={a} b={b} />
      <PickemRosters a={a} b={b} tierOf={tierOf} year={year} />
    </Dialog>
  )
}
