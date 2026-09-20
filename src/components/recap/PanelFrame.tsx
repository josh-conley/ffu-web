import type { ReactNode } from 'react'

/**
 * The bordered, titled block every Around the Union panel is built from: an accent header carrying
 * the block's name and the week it reports on, then the body.
 *
 * One implementation because a capture of any block has to explain itself once it is pasted into
 * the FFUN with no site chrome around it — and because the blocks have to look like a set when the
 * commissioner drops two of them into the same page.
 */
export function PanelFrame({
  title,
  meta,
  compact,
  children,
}: {
  title: string
  /** Right-hand side of the header — the season and week the block covers. */
  meta?: string
  /** The FFUN layout: tighter, for the newsletter's short slot. */
  compact: boolean
  children: ReactNode
}) {
  return (
    <section className="border border-border bg-surface-2/40 shadow-sm">
      <header
        className={`flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 bg-accent text-accent-fg ${compact ? 'px-3 py-1.5' : 'px-4 py-2'}`}
      >
        <h2 className={`font-extrabold uppercase tracking-widest ${compact ? 'text-xs' : 'text-sm'}`}>{title}</h2>
        {meta !== undefined && <span className="font-mono text-xs font-bold tabular-nums">{meta}</span>}
      </header>
      {children}
    </section>
  )
}
