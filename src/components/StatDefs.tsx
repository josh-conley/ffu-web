import type { ReactNode } from 'react'

/**
 * Compact "what do these columns mean?" glossary rendered under a stats table — the visible
 * counterpart to the header `title` tooltips (which don't exist on touch devices).
 */
export function StatDefs({ items, note }: { items: { term: string; def: ReactNode }[]; note?: ReactNode }) {
  return (
    <div className="space-y-2 rounded-md border border-border bg-surface-2 p-4 text-sm">
      <dl className="space-y-1.5">
        {items.map(({ term, def }) => (
          <div key={term} className="flex flex-wrap gap-x-2">
            <dt className="shrink-0 font-semibold">{term}</dt>
            <dd className="text-muted">{def}</dd>
          </div>
        ))}
      </dl>
      {note && <p className="font-medium text-muted">{note}</p>}
    </div>
  )
}
