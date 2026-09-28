import type { ReactNode } from 'react'
import { TeamLogo } from './TeamLogo'
import { useOpenTeamProfile } from './teamProfile'

// A team's logo and name as ONE control that opens its quick profile. The name is the big, obvious
// target (the 22px logo used to be the only way in), and a row gets one tab stop, not a stop on a
// nameless logo. A <button>, not an <a>: the profile is a dialog with no URL of its own.
//
// Stretched-button pattern (`TeamNameButton`): only the name is inside the <button>, so its
// accessible name is the team, not "The Stallions 142.30 · Premier". The button's ::after covers
// the whole block (logo, name, any `detail` line) at least 44px tall, so the logo and subtitle
// click through to it without making dense rows any taller. The focus outline is drawn on that box in `currentColor`,
// which shows on the solid league/accent banners as well as on plain surfaces.
//
// Where two teams stack closer than 44px (a matchup card's two lines) pass `tight`: each hit area
// stays its own line, since a 44px box would reach over the other team's line and open the wrong
// profile.
//
// Inside another button (a card or row that opens something else) pass `plain`: the same logo and
// name as text, since screen readers flatten a button in a button.
const NAME_BUTTON =
  'flex min-w-0 max-w-full cursor-pointer text-left underline-offset-2 hover:underline focus-visible:outline-none ' +
  'after:absolute after:inset-x-0 after:top-1/2 after:h-full after:-translate-y-1/2 ' +
  'focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-current'

/**
 * Just the name as the profile button, stretched over its nearest `relative` ancestor. For layouts
 * `TeamLink` doesn't fit (a heading between an eyebrow and a subtitle): make the team's block
 * `relative`, show a `TeamLogo clickable={false}` in it, and put this around the name.
 */
export function TeamNameButton({
  ffuId,
  label,
  tight = false,
  children,
}: {
  ffuId: string
  label?: string
  tight?: boolean
  children: ReactNode
}) {
  const openProfile = useOpenTeamProfile()
  // No provider (tests, isolated renders): nothing to open, so nothing to press.
  if (openProfile === null) return children
  return (
    <button type="button" aria-haspopup="dialog" aria-label={label} onClick={() => openProfile(ffuId)} className={`${NAME_BUTTON} ${tight ? '' : 'after:min-h-11'}`}>
      {children}
    </button>
  )
}

export function TeamLink({
  ffuId,
  logoSize = 22,
  label,
  detail,
  className = 'gap-2',
  plain = false,
  tight = false,
  children,
}: {
  ffuId: string
  logoSize?: number
  /** Accessible name when the visible text isn't the full team name (e.g. an abbreviation). */
  label?: string
  /** A line under the name (score, league, owners): part of the tap target, not of the name. */
  detail?: ReactNode
  /** Layout of the block: gap, `flex-1`, direction (`flex-col`, `flex-row-reverse`). */
  className?: string
  /** Render as text, not a control: for use inside a card or row that is itself a button. */
  plain?: boolean
  /** Hit area is the block itself, not 44px: for team lines stacked closer than that. */
  tight?: boolean
  /** The name, however the call site styles it. */
  children: ReactNode
}) {
  const name = plain ? children : <TeamNameButton ffuId={ffuId} label={label} tight={tight}>{children}</TeamNameButton>
  return (
    <span className={`relative inline-flex min-w-0 max-w-full items-center ${className}`}>
      <TeamLogo ffuId={ffuId} size={logoSize} clickable={false} />
      {detail === undefined ? name : (
        <span className="flex min-w-0 flex-1 flex-col">
          {name}
          {detail}
        </span>
      )}
    </span>
  )
}
