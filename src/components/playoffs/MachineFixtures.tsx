import { nameForYear } from '@/config'
import type { MachineFixture, MachinePicks, MachineWeek } from '@/selectors'
import { TeamLogo } from '../TeamLogo'

// The games still to play, week by week: tap a team to pick it to win, tap it again to un-pick.
// Each side is a toggle button (aria-pressed), so the pick reads out as state, not just as colour.
// Each team's division sits under its name, so a division game reads as one at a glance.

const SIDE =
  'flex min-h-11 min-w-0 items-center gap-2 border px-2 py-1.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

function sideTone(picked: string | undefined, memberId: string): string {
  if (picked === memberId) return 'border-pick-edge bg-pick font-bold text-text'
  if (picked !== undefined) return 'border-border bg-surface text-muted hover:bg-surface-2'
  return 'border-border bg-surface text-text hover:bg-surface-2'
}

interface SideProps {
  memberId: string
  year: string
  division: string | undefined
  picked: string | undefined
  onPick: () => void
}

function Side({ memberId, year, division, picked, onPick }: SideProps) {
  const name = nameForYear(memberId, year) ?? memberId
  return (
    <button type="button" aria-pressed={picked === memberId} aria-label={name} onClick={onPick} className={`${SIDE} ${sideTone(picked, memberId)}`}>
      <TeamLogo ffuId={memberId} size={22} clickable={false} />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className={`truncate ${picked !== undefined && picked !== memberId ? 'line-through decoration-muted/60' : ''}`}>{name}</span>
        {division && <span className="truncate text-[11px] font-normal text-muted">{division}</span>}
      </span>
    </button>
  )
}

interface FixtureProps {
  fixture: MachineFixture
  year: string
  divisionOf: ReadonlyMap<string, string>
  picks: MachinePicks
  onPick: (key: string, winnerId: string) => void
}

function FixtureRow({ fixture, year, divisionOf, picks, onPick }: FixtureProps) {
  const [a, b] = fixture.memberIds
  const picked = picks[fixture.key]
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
      <Side memberId={a} year={year} division={divisionOf.get(a)} picked={picked} onPick={() => onPick(fixture.key, a)} />
      <span className="text-xs font-bold uppercase text-muted" aria-hidden>
        v
      </span>
      <Side memberId={b} year={year} division={divisionOf.get(b)} picked={picked} onPick={() => onPick(fixture.key, b)} />
    </li>
  )
}

export function MachineFixtures({
  weeks,
  year,
  divisionOf,
  picks,
  onPick,
}: {
  weeks: readonly MachineWeek[]
  year: string
  /** memberId → division name. */
  divisionOf: ReadonlyMap<string, string>
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
              <FixtureRow key={fixture.key} fixture={fixture} year={year} divisionOf={divisionOf} picks={picks} onPick={onPick} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
