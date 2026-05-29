import { useMemo } from 'react'
import { useAllSeasons } from '@/hooks/useLeagueData'
import { useUrlState } from '@/hooks/useUrlState'
import { careerStats, memberSeasons } from '@/selectors'
import { MembersDirectory } from '@/components/MembersDirectory'
import { MemberDetail } from '@/components/MemberDetail'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

export function Members() {
  const { data: seasons, loading, error } = useAllSeasons()
  const [member, setMember] = useUrlState('member', '')
  const careersMap = useMemo(() => (seasons ? careerStats(seasons) : undefined), [seasons])
  const careers = useMemo(() => (careersMap ? [...careersMap.values()] : []), [careersMap])

  if (loading) return <LoadingSpinner />
  if (error || !seasons || !careersMap) return <ErrorMessage error={error ?? 'No data'} />

  const selected = member === '' ? undefined : careersMap.get(member)
  if (selected) {
    return <MemberDetail career={selected} history={memberSeasons(seasons, selected.memberId)} onBack={() => setMember('')} />
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
      <MembersDirectory careers={careers} onSelect={setMember} />
    </div>
  )
}
