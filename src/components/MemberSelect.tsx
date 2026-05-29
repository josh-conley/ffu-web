import { useMemo } from 'react'
import { getMember } from '@/config'

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
      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
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
