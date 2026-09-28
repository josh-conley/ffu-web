import { useMemo } from 'react'
import { getMember } from '@/config'
import { SELECT } from './controls'

/** Dropdown of members (by current name), used to pick a compare target. */
export function MemberSelect({
  memberIds,
  value,
  onChange,
  placeholder,
  label,
  excludeId,
}: {
  memberIds: string[]
  value: string
  onChange: (ffuId: string) => void
  placeholder: string
  /** Accessible name. The placeholder is an option, not a label, so without this a screen reader
   *  announces the select as every option run together. */
  label: string
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
      aria-label={label}
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
