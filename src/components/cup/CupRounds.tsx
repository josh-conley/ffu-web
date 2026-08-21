import { CUP_ROUND_RULES, isCupRoundKey } from '@/config'
import type { RoundOutline } from '@/selectors'

// Round-by-round advancement rules. The rule text is CONFIG (it is the same every season); the
// rounds and their weeks come from the season's data — so a season that shifts its weeks or drops
// a round needs no change here.

export function CupRounds({ rounds }: { rounds: RoundOutline[] }) {
  return (
    <dl className="space-y-3">
      {rounds.map((r) => (
        <div key={r.key} className="border border-border bg-surface px-4 py-3">
          <dt className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-bold uppercase tracking-wide">{r.label}</span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">Week {r.week}</span>
          </dt>
          <dd className="mt-1 max-w-3xl text-sm text-muted">
            {isCupRoundKey(r.key) ? CUP_ROUND_RULES[r.key] : 'Winners advance.'}
          </dd>
        </div>
      ))}
    </dl>
  )
}
