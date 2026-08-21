import type { ReactNode } from 'react'
import { CUP_ACCENT } from '@/config'

// Shared shell for the Cup explainer's sections + its headline facts. Kept here so every section
// on the page is ruled and spaced identically without each one re-stating the styling.

/** One section of the explainer: an accent-ruled heading, an optional lede, then the body. */
export function CupSection({ title, lede, children }: { title: string; lede?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="border-b-2 pb-1 text-sm font-bold uppercase tracking-widest" style={{ borderColor: CUP_ACCENT }}>
        {title}
      </h2>
      {lede !== undefined && <p className="max-w-3xl text-sm text-muted">{lede}</p>}
      {children}
    </section>
  )
}

export interface CupFact {
  value: string
  label: string
}

/** The headline numbers, as square tiles — the "what is this" answer before any prose. */
// flex-col-reverse below: the value reads first, but the <dt> still precedes its <dd> in the DOM.
export function CupFacts({ facts }: { facts: CupFact[] }) {
  return (
    <dl className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
      {facts.map((f) => (
        <div key={f.label} className="flex flex-col-reverse items-center justify-center gap-1 bg-surface px-3 py-4 text-center">
          <dt className="text-[10px] font-bold uppercase tracking-widest text-muted">{f.label}</dt>
          <dd className="text-2xl font-extrabold leading-none tabular-nums" style={{ color: CUP_ACCENT }}>
            {f.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
