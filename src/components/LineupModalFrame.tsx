import { useEffect, useRef, type ReactNode } from 'react'
import { useSeriesStanding } from '@/hooks/useSeriesStanding'
import { SeriesTag } from './SeriesTag'

/**
 * The dialog shell both lineup modals share (LineupModal for a finished season, LiveLineupModal for
 * the current one): backdrop, Escape/backdrop close, focus on open, and the accent header — which
 * carries the pair's all-time series, the stat the commissioner otherwise digs out of Compare.
 */
export function LineupModalFrame({
  title,
  memberIds,
  onClose,
  children,
}: {
  title: string
  memberIds: readonly string[]
  onClose: () => void
  children: ReactNode
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const series = useSeriesStanding(memberIds)

  return (
    <div role="dialog" aria-modal="true" aria-label="Game lineups" onClick={onClose} className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-4xl overflow-auto border border-border bg-surface shadow-xl">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-accent px-4 py-2.5 text-accent-fg">
          <span className="flex flex-wrap items-baseline gap-x-2 text-sm font-bold uppercase tracking-wide">
            <span>{title}</span>
            {series && <span><span aria-hidden="true">· </span><SeriesTag standing={series} /></span>}
          </span>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="rounded px-2 text-lg leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text">✕</button>
        </header>
        {children}
      </div>
    </div>
  )
}
