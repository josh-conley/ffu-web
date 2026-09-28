import { useRef, type MouseEvent, type ReactNode } from 'react'
import { useModalDialog } from '@/hooks/useModalDialog'

const WIDTHS = { md: 'sm:max-w-lg', lg: 'sm:max-w-4xl' } as const

/**
 * The site's one modal: a native <dialog> (see useModalDialog) with the accent title bar and a
 * square 44px close button. A bottom sheet on phones, centred from `sm` up. Closes on the ✕,
 * Escape, or a click on the backdrop. Render it only while open.
 */
export function Dialog({
  label,
  title,
  width = 'md',
  onClose,
  children,
}: {
  /** Accessible name for the dialog as a whole. */
  label: string
  /** Contents of the title bar. */
  title: ReactNode
  width?: keyof typeof WIDTHS
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  useModalDialog(ref, closeRef)

  // The panel fills the dialog box, so a click whose target is the <dialog> itself landed on the
  // ::backdrop around it.
  const onBackdrop = (e: MouseEvent<HTMLDialogElement>) => e.target === e.currentTarget && onClose()

  return (
    // Escape closes the dialog natively; its `close` event is what reports that back up.
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onClick={onBackdrop}
      className={`mx-auto mb-0 mt-auto max-h-[90dvh] w-full max-w-full overflow-auto overscroll-contain border border-border bg-surface p-0 text-text shadow-xl backdrop:bg-black/60 sm:mb-auto ${WIDTHS[width]}`}
    >
      <div>
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-accent pl-4 text-accent-fg">
          <div className="min-w-0 py-2.5 text-sm font-bold uppercase tracking-wide">{title}</div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-11 shrink-0 items-center justify-center text-lg leading-none hover:bg-black/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-fg"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}
