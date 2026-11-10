import { useEffect, type RefObject } from 'react'

/**
 * The ways an open disclosure panel (a header dropdown) is dismissed without choosing something:
 * Escape, which also returns focus to the trigger, and a press anywhere outside the wrapper.
 */
export function useDisclosureDismiss(
  open: boolean,
  wrapRef: RefObject<HTMLElement | null>,
  triggerRef: RefObject<HTMLElement | null>,
  close: () => void,
) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      close()
      triggerRef.current?.focus()
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open, wrapRef, triggerRef, close])
}
