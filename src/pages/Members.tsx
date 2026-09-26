import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { SeasonData, Tournament } from '@/data'
import { useCareerData } from '@/hooks/useLeagueData'
import { useLeagueRosters } from '@/hooks/useLeagueRosters'
import { useScrollToTop } from '@/hooks/useScrollToTop'
import { useUpdateUrlParams } from '@/hooks/useUrlState'
import { careerWinnings, headToHead, membersByLeague, membersById, memberSeasons, upcomingRosters, upcomingYear, type CareerStats } from '@/selectors'
import { MembersDirectory } from '@/components/MembersDirectory'
import { MemberDetail } from '@/components/MemberDetail'
import { MemberCompare } from '@/components/MemberCompare'
import { MemberSelect } from '@/components/MemberSelect'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

/** The detail/compare view for one selected member (extracted to keep the page thin). */
function SelectedMember({
  selected,
  opponent,
  seasons,
  tournaments,
  memberIds,
  vs,
  onBack,
  onVs,
}: {
  selected: CareerStats
  opponent: CareerStats | undefined
  seasons: SeasonData[]
  tournaments: Tournament[]
  memberIds: string[]
  vs: string
  onBack: () => void
  onVs: (id: string) => void
}) {
  // Computed here (not in Members) to keep that function under the complexity cap. Career total
  // across every league — the All-Time figure; cross-tier prizes are already summed in.
  const winnings = useMemo(() => careerWinnings(seasons, tournaments), [seasons, tournaments])
  const totalFor = (id: string) => winnings.get(id)?.total ?? 0
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded text-sm font-semibold text-muted hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          ← All members
        </button>
        <MemberSelect memberIds={memberIds} value={vs} excludeId={selected.memberId} placeholder="Compare with…" onChange={onVs} />
      </div>
      {opponent ? (
        <MemberCompare
          a={selected}
          b={opponent}
          h2h={headToHead(seasons, selected.memberId, opponent.memberId)}
          aWinnings={totalFor(selected.memberId)}
          bWinnings={totalFor(opponent.memberId)}
        />
      ) : (
        <MemberDetail
          career={selected}
          history={memberSeasons(seasons, selected.memberId)}
          winnings={totalFor(selected.memberId)}
          seasons={seasons}
          tournaments={tournaments}
        />
      )}
    </div>
  )
}

export function Members() {
  const { seasons, tournaments, loading, error } = useCareerData()
  const [params] = useSearchParams()
  // The directory groups by who is signed up for the season being played, which Sleeper knows from
  // the day the leagues are created — not by last season's finishes, which strand every promoted or
  // relegated member in the tier they just left and hide anyone who has only just joined.
  const year = seasons ? upcomingYear(seasons) : undefined
  const { rosters } = useLeagueRosters(year)
  const groups = useMemo(() => (seasons ? membersByLeague(seasons, rosters) : undefined), [seasons, rosters])
  const leagues = useMemo(() => (seasons ? upcomingRosters(seasons, rosters) : []), [seasons, rosters])
  // Looked up from the GROUPS, not from careerStats, so everything the directory shows can be
  // opened — a member in their first season has no career row yet but must still be clickable.
  const careersMap = useMemo(() => (groups ? membersById(groups) : new Map<string, CareerStats>()), [groups])
  const memberIds = useMemo(() => [...careersMap.keys()], [careersMap])

  // member + vs live in the URL; update them together so switching members clears a stale compare.
  const member = params.get('member') ?? ''
  const vs = params.get('vs') ?? ''
  // Opening (or leaving) a member, or a compare, swaps the whole view without a route change — start
  // at the top. The compare key matters since Rivals' Compare links sit well down the page.
  useScrollToTop(`${member}|${vs}`)
  const updateParams = useUpdateUrlParams()
  const update = (changes: Record<string, string>) =>
    updateParams(Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v || null])))

  if (loading) return <LoadingSpinner />
  if (error || !seasons || !groups) return <ErrorMessage error={error ?? 'No data'} />

  const selected = member === '' ? undefined : careersMap.get(member)
  if (!selected) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">Members</h1>
        <MembersDirectory groups={groups} year={year} leagues={leagues} onSelect={(id) => update({ member: id, vs: '' })} />
      </div>
    )
  }

  return (
    <SelectedMember
      selected={selected}
      opponent={vs === '' ? undefined : careersMap.get(vs)}
      seasons={seasons}
      tournaments={tournaments}
      memberIds={memberIds}
      vs={vs}
      onBack={() => update({ member: '', vs: '' })}
      onVs={(id) => update({ vs: id })}
    />
  )
}
