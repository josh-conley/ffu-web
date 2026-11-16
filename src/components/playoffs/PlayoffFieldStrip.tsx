import { nameForYear } from '@/config'
import type { ClinchStatus, SeedRow } from '@/selectors'
import { TeamLogo } from '../TeamLogo'
import { CLINCH } from './clinchMarks'

// The playoff field at a glance, for a phone: the seeds in, as logos, pinned under the site header
// while picking games, so each pick's effect shows without leaving the list. The whole strip is one
// button that opens the full seeds view. Hidden from lg up, where the seeds table sits beside the
// games. Rendered as a direct child of the tall games section: a sticky element only sticks within
// its parent, so a wrapper of its own height would pin it to nothing.

export function PlayoffFieldStrip({ rows, year, clinches, onOpen }: {
  rows: readonly SeedRow[]
  year: string
  clinches: ReadonlyMap<string, ClinchStatus>
  onOpen: () => void
}) {
  const field = rows.filter((r) => r.inPlayoffs)
  const names = field.map((r) => `${r.seed} ${nameForYear(r.memberId, year) ?? r.memberId}`).join(', ')
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Playoff field: ${names}. Show all seeds`}
      className="sticky top-[3.875rem] z-10 sm:top-[4.375rem] lg:hidden -mx-4 flex w-[calc(100%+2rem)] items-center gap-2 border-y border-border bg-surface/95 px-4 py-2 backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span className="shrink-0 text-[10px] font-bold uppercase leading-tight tracking-wider text-muted">
        Field
      </span>
      <span className="flex min-w-0 flex-1 justify-between gap-1">
        {field.map((r) => {
          const clinch = clinches.get(r.memberId)
          return (
            <span key={r.memberId} className="flex flex-col items-center gap-0.5">
              <TeamLogo ffuId={r.memberId} size={28} clickable={false} />
              <span className="text-[10px] font-bold leading-none tabular-nums text-text">
                {r.seed}
                {clinch && clinch !== 'eliminated' && <span className="text-positive">{CLINCH[clinch].mark}</span>}
              </span>
            </span>
          )
        })}
      </span>
    </button>
  )
}
