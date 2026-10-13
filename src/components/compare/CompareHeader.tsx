import { getMember, ownerNames } from '@/config'
import { currentLeague, seriesStanding, type CompareSide, type H2HRecord } from '@/selectors'
import { LEAGUE_STYLES } from '../leagues'
import { LeagueBadge } from '../LeagueBadge'
import { SeriesHeadline } from '../SeriesTag'
import { TeamLogo } from '../TeamLogo'

// The top of the Compare view: each member's nameplate, striped in the league they play in now,
// either side of the all-time series. Names are deliberately not links: the view also opens inside
// the matchup modal, where a link would change the page under a dialog that stays open.

function tenure(side: CompareSide): string {
  const { firstYear, lastYear, seasons } = side.career
  if (firstYear === null) return 'First season'
  return `${firstYear}–${lastYear} · ${seasons} season${seasons === 1 ? '' : 's'}`
}

function Plate({ side }: { side: CompareSide }) {
  const id = side.memberId
  const league = currentLeague(side.career)
  const owners = ownerNames(id)
  return (
    <div className="relative flex min-w-0 flex-col items-center gap-1.5 border border-border bg-surface px-2 pb-3 pt-4 text-center shadow-sm">
      <span className={`absolute inset-x-0 top-0 h-1 ${league ? LEAGUE_STYLES[league].dot : 'bg-border'}`} aria-hidden />
      <TeamLogo ffuId={id} size={56} clickable={false} />
      <h2 className="text-base font-extrabold uppercase leading-tight tracking-tight sm:text-lg">{getMember(id)?.name ?? id}</h2>
      <p className="text-xs text-muted">{owners.length > 0 ? owners.join(' / ') : 'Owner TBD'}</p>
      <p className="text-xs tabular-nums text-muted">{tenure(side)}</p>
      {league && <LeagueBadge tier={league} />}
    </div>
  )
}

/** The two nameplates and, between them, the all-time series. */
export function CompareHeader({ a, b, h2h }: { a: CompareSide; b: CompareSide; h2h: H2HRecord }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-2 sm:gap-4">
      <Plate side={a} />
      <div className="flex w-16 flex-col items-center justify-center gap-1 text-center sm:w-28">
        <span className="text-2xl font-black uppercase tracking-widest text-accent sm:text-3xl">vs</span>
        <SeriesHeadline standing={seriesStanding(h2h)} className="text-[11px] font-semibold leading-tight text-muted" />
      </div>
      <Plate side={b} />
    </div>
  )
}
