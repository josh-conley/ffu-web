import { useState } from 'react'
import { getMember } from '@/config'

// Logos live at /team-logos/{ffuId}.png (carried over from the old app). Members without a logo
// (and on load error) fall back to the abbreviation in a neutral circle — same as the old site.
export function TeamLogo({ ffuId, size = 28 }: { ffuId: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const member = getMember(ffuId)
  const dimension = { width: size, height: size }

  if (failed || member === undefined) {
    return (
      <span
        style={dimension}
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300"
        aria-hidden
      >
        {member?.abbreviation ?? '?'}
      </span>
    )
  }

  return (
    <img
      src={`/team-logos/${ffuId}.png`}
      alt={`${member.name} logo`}
      style={dimension}
      className="shrink-0 rounded-full object-contain"
      onError={() => setFailed(true)}
      loading="lazy"
    />
  )
}
