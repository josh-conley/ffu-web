import { useState, type KeyboardEvent, type MouseEvent } from 'react'
import { getMember } from '@/config'
import { useOpenTeamProfile } from './teamProfile'

// Logos live at /team-logos/{ffuId}.png (carried over from the old app). Members without a logo
// (and on load error) fall back to the abbreviation in a neutral circle — same as the old site.
// `object-cover` on a white disc (not `object-contain`): the source images aren't all square, and
// contain letterboxes them so they render undersized with corners clipped by the circular mask.
interface TeamLogoProps {
  ffuId: string
  size?: number
  /** Opt out of the click-to-open profile (e.g. inside the profile modal itself). */
  clickable?: boolean
}

export function TeamLogo({ ffuId, size = 32, clickable = true }: TeamLogoProps) {
  const [failed, setFailed] = useState(false)
  const openProfile = useOpenTeamProfile()
  const member = getMember(ffuId)
  const dimension = { width: size, height: size }

  const logo =
    failed || member === undefined ? (
      <span
        style={dimension}
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10px] font-semibold text-muted ring-1 ring-border"
        aria-hidden
      >
        {member?.abbreviation ?? '?'}
      </span>
    ) : (
      <img
        src={`/team-logos/${ffuId}.png`}
        alt={`${member.name} logo`}
        style={dimension}
        className="shrink-0 rounded-full bg-surface object-cover ring-1 ring-border"
        onError={() => setFailed(true)}
        loading="lazy"
      />
    )

  if (!clickable || openProfile === null) return logo

  // A role=button span (not <button>) so it stays valid markup when nested inside a row link.
  const open = (e: MouseEvent | KeyboardEvent) => {
    e.preventDefault()
    e.stopPropagation()
    openProfile(ffuId)
  }
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={`${member?.name ?? ffuId} team profile`}
      onClick={open}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && open(e)}
      className="shrink-0 cursor-pointer rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {logo}
    </span>
  )
}
