import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// A small explanation panel on a trigger: opens on hover (with a pointer) and on press (touch,
// keyboard), closes on Escape, on a press outside, or when the pointer leaves both trigger and panel.
//
// Portalled to <body> with fixed positioning, because its usual home is a table cell inside a
// horizontally scrolling box, which would clip an absolutely positioned panel. A disclosure (button
// + aria-expanded + aria-controls), not a tooltip: the panel holds a table, and tooltips are text.

const WIDTH = 320
const GAP = 6
const EDGE = 8
const HOVER_DELAY = 120

interface Position {
  top: number
  left: number
}

/** Below the trigger, right edges aligned, kept on screen; above it when there's no room below. */
function place(trigger: DOMRect, panelHeight: number): Position {
  const width = Math.min(WIDTH, window.innerWidth - EDGE * 2)
  const left = Math.min(Math.max(trigger.right - width, EDGE), window.innerWidth - width - EDGE)
  const below = trigger.bottom + GAP
  const fitsBelow = below + panelHeight <= window.innerHeight - EDGE
  return { left, top: fitsBelow || trigger.top < panelHeight ? below : trigger.top - GAP - panelHeight }
}

function usePanelPosition(open: boolean, triggerRef: React.RefObject<HTMLElement | null>, panelRef: React.RefObject<HTMLElement | null>) {
  const [position, setPosition] = useState<Position | null>(null)
  const update = useCallback(() => {
    const trigger = triggerRef.current?.getBoundingClientRect()
    if (trigger) setPosition(place(trigger, panelRef.current?.offsetHeight ?? 0))
  }, [triggerRef, panelRef])
  useLayoutEffect(() => {
    if (!open) return
    update()
    // Measured once more after the panel has rendered, now that its height is known.
    const frame = requestAnimationFrame(update)
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, update])
  return position
}

function useDismiss(open: boolean, refs: React.RefObject<HTMLElement | null>[], close: (refocus: boolean) => void) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(true)
    const onPointerDown = (e: PointerEvent) => {
      if (!refs.some((r) => r.current?.contains(e.target as Node))) close(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open, refs, close])
}

export function InfoPopover({ label, trigger, triggerClassName, children }: {
  /** The trigger's accessible name, e.g. "How the tie was broken". */
  label: string
  trigger: ReactNode
  triggerClassName: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [refs] = useState(() => [triggerRef, panelRef])
  const hoverTimer = useRef<number | undefined>(undefined)
  const id = useId()
  const position = usePanelPosition(open, triggerRef, panelRef)

  const close = useCallback((refocus: boolean) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus()
  }, [])
  useDismiss(open, refs, close)
  useEffect(() => () => window.clearTimeout(hoverTimer.current), [])

  // Hover only for a real pointer: on touch, the emulated mouseenter would fight the tap's toggle.
  const hover = (next: boolean) => (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    window.clearTimeout(hoverTimer.current)
    hoverTimer.current = window.setTimeout(() => setOpen(next), HOVER_DELAY)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
        onPointerEnter={hover(true)}
        onPointerLeave={hover(false)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            id={id}
            onPointerEnter={hover(true)}
            onPointerLeave={hover(false)}
            style={{ position: 'fixed', top: position?.top ?? -9999, left: position?.left ?? -9999, width: Math.min(WIDTH, window.innerWidth - EDGE * 2) }}
            className="z-50 border border-border bg-surface p-3 text-left text-sm font-normal normal-case tracking-normal text-text shadow-lg"
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  )
}
