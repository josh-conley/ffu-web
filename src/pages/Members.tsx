import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { SeasonData } from '@/data'
import { useAllSeasons } from '@/hooks/useLeagueData'
import { useLeagueRosters } from '@/hooks/useLeagueRosters'
import { useScrollToTop } from '@/hooks/useScrollToTop'
import { careerWinnings, headToHead, membersByLeague, membersById, memberSeasons, upcomingYear, type CareerStats } from '@/selectors'
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
  memberIds,
  vs,
  onBack,
  onVs,
}: {
  selected: CareerStats
  opponent: CareerStats | undefined
  seasons: SeasonData[]
  memberIds: string[]
  vs: string
  onBack: () => void
  onVs: (id: string) => void
}) {
  // Computed here (not in Members) to keep that function under the complexity cap. Career total
  // across every league — the All-Time figure; cross-tier prizes are already summed in.
  const winnings = useMemo(() => careerWinnings(seasons), [seasons])
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
        <MemberDetail career={selected} history={memberSeasons(seasons, selected.memberId)} winnings={totalFor(selected.memberId)} />
      )}
    </div>
  )
}

export function Members() {
  const { data: seasons, loading, error } = useAllSeasons()
  const [params, setParams] = useSearchParams()
  // The directory groups by who is signed up for the season being played, which Sleeper knows from
  // the day the leagues are created — not by last season's finishes, which strand every promoted or
  // relegated member in the tier they just left and hide anyone who has only just joined.
  const { rosters } = useLeagueRosters(seasons ? upcomingYear(seasons) : undefined)
  const groups = useMemo(() => (seasons ? membersByLeague(seasons, rosters) : undefined), [seasons, rosters])
  // Looked up from the GROUPS, not from careerStats, so everything the directory shows can be
  // opened — a member in their first season has no career row yet but must still be clickable.
  const careersMap = useMemo(() => (groups ? membersById(groups) : new Map<string, CareerStats>()), [groups])
  const memberIds = useMemo(() => [...careersMap.keys()], [careersMap])

  // member + vs live in the URL; update them together so switching members clears a stale compare.
  const member = params.get('member') ?? ''
  const vs = params.get('vs') ?? ''
  // Opening (or leaving) a member swaps the whole view without a route change — start at the top.
  useScrollToTop(member)
  const update = (changes: Record<string, string>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(changes)) {
          if (v) next.set(k, v)
          else next.delete(k)
        }
        return next
      },
      { replace: true },
    )

  if (loading) return <LoadingSpinner />
  if (error || !seasons || !groups) return <ErrorMessage error={error ?? 'No data'} />

  const selected = member === '' ? undefined : careersMap.get(member)
  if (!selected) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">Members</h1>
        <MembersDirectory groups={groups} onSelect={(id) => update({ member: id, vs: '' })} />
      </div>
    )
  }

  return (
    <SelectedMember
      selected={selected}
      opponent={vs === '' ? undefined : careersMap.get(vs)}
      seasons={seasons}
      memberIds={memberIds}
      vs={vs}
      onBack={() => update({ member: '', vs: '' })}
      onVs={(id) => update({ vs: id })}
    />
  )
}
