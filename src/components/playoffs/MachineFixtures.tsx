import { nameForYear } from '@/config'
import type { MachineFixture, MachinePicks, MachineWeek } from '@/selectors'
import { TeamLogo } from '../TeamLogo'

// The games still to play, week by week: tap a team to pick it to win, tap it again to un-pick.
// Each side is a toggle button (aria-pressed), so the pick reads out as state, not just as colour.

const SIDE =
  'flex min-h-11 min-w-0 items-center gap-2 border px-2 py-1.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

function sideTone(picked: string | undefined, memberId: string): string {
  if (picked === memberId) return 'border-pick-edge bg-pick font-bold text-text'
  if (picked !== undefined) return 'border-border bg-surface text-muted line-through decoration-muted/60 hover:bg-surface-2'
  return 'border-border bg-surface text-text hover:bg-surface-2'
}

function Side({ memberId, year, picked, onPick }: { memberId: string; year: string; picked: string | undefined; onPick: () => void }) {
  const name = nameForYear(memberId, year) ?? memberId
  return (
    <button type="button" aria-pressed={picked === memberId} onClick={onPick} className={`${SIDE} ${sideTone(picked, memberId)}`}>
      <TeamLogo ffuId={memberId} size={22} clickable={false} />
      <span className="min-w-0 truncate">{name}</span>
    </button>
  )
}

function FixtureRow({ fixture, year, picks, onPick }: { fixture: MachineFixture; year: string; picks: MachinePicks; onPick: (key: string, winnerId: string) => void }) {
  const [a, b] = fixture.memberIds
  const picked = picks[fixture.key]
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
      <Side memberId={a} year={year} picked={picked} onPick={() => onPick(fixture.key, a)} />
      <span className="text-xs font-bold uppercase text-muted" aria-hidden>
        v
      </span>
      <Side memberId={b} year={year} picked={picked} onPick={() => onPick(fixture.key, b)} />
    </li>
  )
}

export function MachineFixtures({
  weeks,
  year,
  picks,
  onPick,
}: {
  weeks: readonly MachineWeek[]
  year: string
  picks: MachinePicks
  onPick: (key: string, winnerId: string) => void
}) {
  return (
    <div className="space-y-5">
      {weeks.map(({ week, fixtures }) => (
        <section key={week} aria-labelledby={`machine-week-${week}`}>
          <h3 id={`machine-week-${week}`} className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
            Week {week}
          </h3>
          <ul className="space-y-1.5">
            {fixtures.map((fixture) => (
              <FixtureRow key={fixture.key} fixture={fixture} year={year} picks={picks} onPick={onPick} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
