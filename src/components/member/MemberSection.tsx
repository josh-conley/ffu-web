import type { ReactNode } from 'react'

/** One titled section of a member's page, so every section reads the same way. */
export function MemberSection({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-text">
        <span className="inline-block h-4 w-1 bg-accent" aria-hidden />
        {title}
      </h2>
      {note && <p className="text-sm text-muted">{note}</p>}
      {children}
    </section>
  )
}

/** A section with nothing to show yet, said plainly rather than left as an empty table. */
export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="border border-dashed border-border bg-surface/60 p-4 text-sm text-muted">{children}</p>
}
