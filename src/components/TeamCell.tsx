import { getMember, nameForYear } from '@/config'
import { TeamLogo } from './TeamLogo'

/**
 * A team as a table cell: logo + name. With a `year`, the name that team went by that season;
 * without one, its current name (for rows that span several seasons).
 */
export function TeamCell({ ffuId, year }: { ffuId: string; year?: string }) {
  const name = (year === undefined ? getMember(ffuId)?.name : nameForYear(ffuId, year)) ?? ffuId
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <TeamLogo ffuId={ffuId} size={22} />
      {name}
    </span>
  )
}
