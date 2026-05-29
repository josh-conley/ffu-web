import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAllSeasons } from '@/hooks/useLeagueData'
import { careerStats, headToHead, memberSeasons } from '@/selectors'
import { MembersDirectory } from '@/components/MembersDirectory'
import { MemberDetail } from '@/components/MemberDetail'
import { MemberCompare } from '@/components/MemberCompare'
import { MemberSelect } from '@/components/MemberSelect'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

export function Members() {
  const { data: seasons, loading, error } = useAllSeasons()
  const [params, setParams] = useSearchParams()
  const careersMap = useMemo(() => (seasons ? careerStats(seasons) : undefined), [seasons])
  const memberIds = useMemo(() => (careersMap ? [...careersMap.keys()] : []), [careersMap])
  const careers = useMemo(() => (careersMap ? [...careersMap.values()] : []), [careersMap])

  // member + vs live in the URL; update them together so switching members clears a stale compare.
  const member = params.get('member') ?? ''
  const vs = params.get('vs') ?? ''
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
  if (error || !seasons || !careersMap) return <ErrorMessage error={error ?? 'No data'} />

  const selected = member === '' ? undefined : careersMap.get(member)
  if (!selected) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">Members</h1>
        <MembersDirectory careers={careers} onSelect={(id) => update({ member: id, vs: '' })} />
      </div>
    )
  }

  const opponent = vs === '' ? undefined : careersMap.get(vs)
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => update({ member: '', vs: '' })}
          className="rounded text-sm font-semibold text-muted hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          ← All members
        </button>
        <MemberSelect
          memberIds={memberIds}
          value={vs}
          excludeId={selected.memberId}
          placeholder="Compare with…"
          onChange={(id) => update({ vs: id })}
        />
      </div>
      {opponent ? (
        <MemberCompare a={selected} b={opponent} h2h={headToHead(seasons, selected.memberId, opponent.memberId)} />
      ) : (
        <MemberDetail career={selected} history={memberSeasons(seasons, selected.memberId)} />
      )}
    </div>
  )
}
