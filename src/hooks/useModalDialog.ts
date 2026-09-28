import { useEffect, type RefObject } from 'react'

/**
 * Opens a native <dialog> as a modal for as long as the component is mounted. `showModal()` gives
 * the browser's own inert background, top layer and Escape handling; this adds what it doesn't:
 * - focus lands on `initialFocus` (the close button), not wherever the browser picks;
 * - the page behind stops scrolling (a modal dialog doesn't lock it by itself);
 * - on close, focus goes back to the control that opened it.
 *
 * Mount/unmount IS open/close here: callers render the dialog only while it's open, so there's no
 * `open` prop to keep in sync with the element's own state.
 */
export function useModalDialog(
  dialog: RefObject<HTMLDialogElement | null>,
  initialFocus: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    const el = dialog.current
    if (!el) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const root = document.documentElement
    const previousOverflow = root.style.overflow

    if (!el.open) el.showModal()
    initialFocus.current?.focus()
    root.style.overflow = 'hidden'

    return () => {
      if (el.open) el.close()
      root.style.overflow = previousOverflow
      if (opener?.isConnected) opener.focus()
    }
  }, [dialog, initialFocus])
}
