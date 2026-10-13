import { useMemberComparison } from '@/hooks/useMemberComparison'
import { ErrorMessage } from '../ErrorMessage'
import { LoadingSpinner } from '../LoadingSpinner'
import { MemberCompare } from './MemberCompare'

/** The Compare view for two members, loading its own data: the matchup modal's Compare side. */
export function CompareBody({ a, b }: { a: string; b: string }) {
  const { comparison, loading, error } = useMemberComparison(a, b)
  if (loading) return <div className="p-10"><LoadingSpinner /></div>
  if (!comparison) return <div className="p-4"><ErrorMessage error={error ?? 'No data'} /></div>
  return (
    <div className="p-4">
      <MemberCompare comparison={comparison} />
    </div>
  )
}
