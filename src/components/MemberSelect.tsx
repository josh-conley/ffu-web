import { useMemo } from 'react'
import { getMember } from '@/config'
import { SELECT } from './controls'

/** Dropdown of members (by current name), used to pick a compare target. */
export function MemberSelect({
  memberIds,
  value,
  onChange,
  placeholder,
  excludeId,
}: {
  memberIds: string[]
  value: string
  onChange: (ffuId: string) => void
  placeholder: string
  excludeId?: string
}) {
  const options = useMemo(
    () =>
      memberIds
        .filter((id) => id !== excludeId)
        .map((id) => ({ id, name: getMember(id)?.name ?? id }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [memberIds, excludeId],
  )

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={SELECT}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  )
}
