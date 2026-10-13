import { useMemo } from 'react'
import { memberComparison, type MemberComparison } from '@/selectors'
import { useCareerData } from './useLeagueData'

/**
 * Two members' comparison (memberComparison) over every season and Cup on file — the Members page's
 * Compare and the matchup modal's both read it, from the same cached season files.
 */
export function useMemberComparison(a: string, b: string): { comparison: MemberComparison | undefined; loading: boolean; error: Error | undefined } {
  const { seasons, tournaments, loading, error } = useCareerData()
  const comparison = useMemo(() => (seasons ? memberComparison(seasons, tournaments, a, b) : undefined), [seasons, tournaments, a, b])
  return { comparison, loading, error }
}
