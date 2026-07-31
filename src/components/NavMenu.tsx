import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useNavHref } from '@/hooks/useNavHref'
import type { NavGroup } from './nav'

// Desktop-only dropdown for one nav group. Implemented as a DISCLOSURE (button with
// aria-expanded + a panel of links), not a `role="menu"` widget: these are plain navigation links,
// and the menu role would promise arrow-key menu semantics screen-reader users would then expect.
//
// Opens on hover for mice and on click/tap for everything else. The hover handlers are filtered to
// `pointerType === 'mouse'` so a touch tap doesn't both hover-open and click-toggle (which would
// leave the panel shut). Closes on pointer-out, Escape (focus returns to the button), outside
// pointerdown, and navigation.

const TRIGGER_BASE =
  'flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60'

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="square"
      aria-hidden
      className={`transition-transform duration-150 ${open ? 'rotate-180' : ''} opacity-80`}
    >
      <path d="M2 4.5 6 8.5 10 4.5" />
    </svg>
  )
}

/** The open dropdown: the group's links, offset from the trigger by a transparent hover bridge. */
function MenuPanel({ group, panelId, onNavigate }: { group: NavGroup; panelId: string; onNavigate: () => void }) {
  const hrefFor = useNavHref()
  return (
    // right-0, not left-0: the nav sits at the right edge of the header, and the panel is wider
    // than its trigger — anchoring left pushed the last menu ("More") past the viewport and made
    // the whole page horizontally scrollable. Growing leftwards keeps every panel on screen.
    //
    // pt-1.5 is a TRANSPARENT bridge: it keeps the gap between trigger and panel inside the hover
    // subtree, so crossing it doesn't fire pointerleave and snap the panel shut.
    <div id={panelId} className="absolute right-0 top-full z-30 w-52 pt-1.5">
      <div className="flex flex-col border border-border bg-surface shadow-xl">
        {/* Accent cap — same card language as the rest of the site (see LatestChampions). */}
        <span aria-hidden className="h-0.5 bg-accent" />
        {group.items.map((item) => (
          <NavLink
            key={item.to}
            to={hrefFor(item)}
            end={item.end}
            // Dismiss on navigation — including re-clicking the page you're already on, which
            // wouldn't change `pathname`.
            onClick={onNavigate}
            className={({ isActive }) =>
              `border-l-2 px-3 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
                isActive
                  ? 'border-accent bg-accent text-accent-fg'
                  : 'border-transparent text-text hover:border-accent hover:bg-surface-2'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}

export function NavMenu({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const { pathname } = useLocation()

  // A group reads as active when you're on one of its pages, so the bar still shows where you are
  // while its links are tucked away.
  const groupActive = group.items.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  // pointerenter/leave account for the DOM subtree, so moving down into the panel doesn't close it
  // — as long as no visual gap separates them (the panel supplies its own offset via padding).
  const hovering = useRef(false)
  const onPointerEnter = (e: ReactPointerEvent) => {
    if (e.pointerType !== 'mouse') return
    hovering.current = true
    setOpen(true)
  }
  const onPointerLeave = (e: ReactPointerEvent) => {
    if (e.pointerType !== 'mouse') return
    hovering.current = false
    setOpen(false)
  }

  // Clicking a menu the mouse already hovered open PINS it rather than toggling it shut — otherwise
  // the hover would open it and the click would immediately close it again. Keyboard (no pointer)
  // and touch (filtered out of `hover`) still get a plain open/close toggle.
  const onTriggerClick = () => {
    if (hovering.current) setOpen(true)
    else setOpen((v) => !v)
  }

  return (
    <div ref={wrapRef} className="relative" onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onTriggerClick}
        className={`${TRIGGER_BASE} ${
          groupActive
            ? 'bg-accent text-accent-fg'
            : `hover:bg-white/10 hover:text-white ${open ? 'bg-white/10 text-white' : 'text-white/70'}`
        }`}
      >
        {group.label}
        <Chevron open={open} />
      </button>

      {open && <MenuPanel group={group} panelId={panelId} onNavigate={() => setOpen(false)} />}
    </div>
  )
}
