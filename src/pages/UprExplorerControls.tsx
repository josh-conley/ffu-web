import type { ReactNode } from 'react'
import { SELECT, segButton } from '@/components/controls'
import { LEAGUE_STYLES } from '@/components/leagues'
import { MemberSelect } from '@/components/MemberSelect'
import { RangeSlider } from '@/components/RangeSlider'
import { YearRange } from '@/components/YearRange'
import { UPR_MIN_WEEKS } from '@/selectors'
import type { UprExplorerState, UprOrder } from './uprExplorerState'

// The UPR Explorer's controls. Row 1 = the sample (which team-seasons are ranked), row 2 = the
// question asked of it (through which week, best or worst first). The member filter only picks rows
// out of the ranking, so its rows keep their place among everyone.

const LEAGUE_OPTIONS = [
  { value: 'ALL', label: 'All Leagues' },
  ...(['PREMIER', 'MASTERS', 'NATIONAL'] as const).map((t) => ({ value: t, label: LEAGUE_STYLES[t].label })),
]

const ORDERS: { value: UprOrder; label: string }[] = [
  { value: 'high', label: 'Highest' },
  { value: 'low', label: 'Lowest' },
]

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  )
}

function OrderToggle({ order, onOrder }: { order: UprOrder; onOrder: (o: UprOrder) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">Show</span>
      <div role="group" aria-label="Order" className="flex">
        {ORDERS.map((o) => (
          <button key={o.value} type="button" aria-pressed={order === o.value} onClick={() => onOrder(o.value)} className={segButton(order === o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function UprExplorerControls({ state, years, maxWeek, memberIds }: { state: UprExplorerState; years: string[]; maxWeek: number; memberIds: string[] }) {
  const { week, setWeek, league, setLeague, member, setMember, order, setOrder, yearRange, reset } = state
  const row = 'flex flex-wrap items-end gap-x-4 gap-y-3'
  return (
    <div className="space-y-3 border border-border bg-surface p-3">
      <div className={row}>
        <Field label="League">
          <select className={`${SELECT} w-full sm:w-40`} value={league} onChange={(e) => setLeague(e.target.value)} aria-label="League">
            {LEAGUE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Member">
          <MemberSelect memberIds={memberIds} value={member} onChange={setMember} placeholder="All members" label="Member" />
        </Field>
        <YearRange years={years} fromYear={yearRange.fromYear} toYear={yearRange.toYear} onFrom={yearRange.setFrom} onTo={yearRange.setTo} />
        <button type="button" onClick={reset} className={`${segButton(false)} ml-auto self-end`}>Reset</button>
      </div>
      <div className={`${row} border-t border-border pt-3`}>
        {/* Starts at UPR_MIN_WEEKS: no earlier week has a UPR anywhere on the site. */}
        <RangeSlider label="Through week" value={week} min={UPR_MIN_WEEKS} max={maxWeek} valueLabel={`Wk ${week}`} onChange={(v) => setWeek(Number(v))} />
        <OrderToggle order={order} onOrder={setOrder} />
      </div>
    </div>
  )
}
