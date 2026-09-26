import { formerNames, getMember, ownerNames } from '@/config'
import type { SeasonData, Tournament } from '@/data'
import type { CareerStats, MemberSeason } from '@/selectors'
import { TeamLogo } from './TeamLogo'
import { CareerSection } from './member/CareerSection'
import { RivalsTable } from './member/RivalsTable'
import { FranchisePlayers } from './member/FranchisePlayers'
import { TierMovesSection } from './member/TierMovesSection'
import { MemberMilestones } from './member/MemberMilestones'

/** "Formerly Goat Emoji II" — every name the franchise has gone by, most recently used first. */
function FormerNames({ memberId }: { memberId: string }) {
  const former = formerNames(memberId)
  if (former.length === 0) return null
  return <div className="text-sm italic text-muted">Formerly {former.map((f) => f.name).join(' · ')}</div>
}

/**
 * A member who has signed up but not yet finished a season. They reach this page because the
 * directory now lists the CURRENT season's rosters rather than last season's finishers, so every
 * career figure below would be a zero and every table empty — say so once instead.
 */
function FirstSeasonDetail({ memberId }: { memberId: string }) {
  const member = getMember(memberId)
  const owners = ownerNames(memberId)
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <TeamLogo ffuId={memberId} size={48} />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{member?.name ?? memberId}</h1>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">New</span>
          </div>
          <div className="text-sm text-muted">{owners.length > 0 ? owners.join(' / ') : 'Owner TBD'}</div>
          <FormerNames memberId={memberId} />
        </div>
      </header>
      <p className="border border-border bg-surface p-4 text-sm text-muted shadow-sm">
        Playing their first FFU season — career records, the trophy case and season history all
        start once the season is in the books.
      </p>
    </div>
  )
}

interface MemberDetailProps {
  career: CareerStats
  history: MemberSeason[]
  winnings: number
  seasons: SeasonData[]
  tournaments: Tournament[]
}

/**
 * One member's page, in a fixed order: Career, Rivals, Franchise players, Up/down history,
 * Milestones. Franchise players loads every lineup file, so it waits until it is scrolled near.
 */
export function MemberDetail({ career, history, winnings, seasons, tournaments }: MemberDetailProps) {
  const member = getMember(career.memberId)
  const owners = ownerNames(career.memberId)
  if (career.seasons === 0) return <FirstSeasonDetail memberId={career.memberId} />
  const tenure = career.firstYear === null ? '' : `${career.firstYear}–${career.lastYear} · ${career.seasons} seasons`

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        <TeamLogo ffuId={career.memberId} size={48} />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{member?.name ?? career.memberId}</h1>
            {career.isActive && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">Active</span>}
          </div>
          <div className="text-sm text-muted">
            {owners.length > 0 ? owners.join(' / ') : 'Owner TBD'}
            {tenure && ` · ${tenure}`}
          </div>
          <FormerNames memberId={career.memberId} />
        </div>
      </header>
      <CareerSection career={career} history={history} winnings={winnings} />
      <RivalsTable memberId={career.memberId} seasons={seasons} />
      <FranchisePlayers memberId={career.memberId} />
      <TierMovesSection history={history} />
      <MemberMilestones memberId={career.memberId} seasons={seasons} tournaments={tournaments} />
    </div>
  )
}
