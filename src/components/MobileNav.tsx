import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink } from 'react-router-dom'
import type { NavItem } from './nav'

const MENU_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
)
const CLOSE_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </svg>
)

// Portaled to <body> so the overlay escapes the header's sticky stacking context (otherwise a
// nested z-index stays trapped below the page content that paints later in the DOM).
function NavDrawer({
  items,
  panelRef,
  onClose,
}: {
  items: readonly NavItem[]
  panelRef: React.RefObject<HTMLDivElement | null>
  onClose: () => void
}) {
  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Scrim closes on tap. */}
      <button type="button" aria-label="Close menu" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div
        ref={panelRef}
        id="mobile-nav-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        className="absolute right-0 top-0 flex h-full w-64 max-w-[80%] flex-col gap-1 border-l-2 border-accent bg-surface p-4 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="mb-2 self-end flex size-11 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {CLOSE_ICON}
        </button>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex min-h-11 items-center px-3 text-base font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text ${
                isActive ? 'angular-sm bg-accent text-accent-fg' : 'rounded-md text-muted hover:bg-surface-2 hover:text-text'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>,
    document.body,
  )
}

// Mobile-only nav: hamburger button + slide-in drawer. The desktop row (in Header) handles
// >=md; this renders only below md. Accessible: aria-expanded, Esc to close, focus moves into
// the drawer on open and back to the trigger on close.
export function MobileNav({ items }: { items: readonly NavItem[] }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    // Move focus into the panel so the close button / first link is reachable.
    panelRef.current?.querySelector<HTMLElement>('a, button')?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const close = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div className="md:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label="Open menu"
        className="flex size-11 items-center justify-center rounded-md text-text hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {MENU_ICON}
      </button>

      {open && <NavDrawer items={items} panelRef={panelRef} onClose={close} />}
    </div>
  )
}
