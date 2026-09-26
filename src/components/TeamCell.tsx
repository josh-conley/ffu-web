import { getMember, nameForYear } from '@/config'
import { TeamLink } from './TeamLink'

/**
 * A team as a table cell: logo + name, opening its profile. With a `year`, the name that team went by that season;
 * without one, its current name (for rows that span several seasons).
 */
export function TeamCell({ ffuId, year }: { ffuId: string; year?: string }) {
  const name = (year === undefined ? getMember(ffuId)?.name : nameForYear(ffuId, year)) ?? ffuId
  return (
    <TeamLink ffuId={ffuId} className="gap-2 whitespace-nowrap">
      {name}
    </TeamLink>
  )
}
