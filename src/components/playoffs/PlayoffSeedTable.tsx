import type { Division } from '@/data'
import type { SeedRow, TiebreakStep } from '@/selectors'
import { nameForYear } from '@/config'
import { TeamLink } from '../TeamLink'
import { TD_BASE, TH_BASE } from '../tableShared'
import { formatPoints, recordLabel } from '../format'

// The projected seeds, 1 to 12, with the playoff line drawn under the last seed in. A plain table
// rather than DataTable: the order IS the content (re-sorting by points would hide the seeding),
// and it needs the cut line, which DataTable has no notion of.

const TIEBREAK: Record<TiebreakStep, { label: string; title: string }> = {
  h2h: { label: 'H2H', title: 'Level on record; placed by head-to-head record against the other tied teams' },
  points: { label: 'PF', title: 'Level on record and head to head; placed by points for' },
}

const CHIP = 'inline-block border px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide'

function Status({ row }: { row: SeedRow }) {
  return (
    <span className="flex flex-wrap items-center gap-1">
      {row.bye && <span className={`${CHIP} border-positive text-positive`}>Bye</span>}
      {row.divisionWinner && (
        <span className={`${CHIP} border-border text-text`} title="Division winner">
          Div
        </span>
      )}
      {row.guaranteedSpot && (
        <span className={`${CHIP} border-notable text-notable`} title="Division winner: guaranteed a playoff spot">
          Guaranteed
        </span>
      )}
      {row.tiebreak && (
        <span className={`${CHIP} border-border text-muted`} title={TIEBREAK[row.tiebreak].title}>
          {TIEBREAK[row.tiebreak].label}
        </span>
      )}
    </span>
  )
}

function SeedLine({ row, year, divisionName, lastIn }: { row: SeedRow; year: string; divisionName?: string; lastIn: boolean }) {
  const tone = row.inPlayoffs ? '' : 'text-muted'
  return (
    <tr className={`${lastIn ? 'border-b-2 border-b-accent' : 'border-b border-border'} ${tone}`}>
      <td className={`${TD_BASE} text-right font-bold tabular-nums`}>{row.seed}</td>
      <td className={`${TD_BASE} relative`}>
        <TeamLink ffuId={row.memberId} className="gap-2 whitespace-nowrap font-semibold">
          {nameForYear(row.memberId, year) ?? row.memberId}
        </TeamLink>
      </td>
      <td className={`${TD_BASE} whitespace-nowrap`}>{divisionName ?? '—'}</td>
      <td className={`${TD_BASE} whitespace-nowrap tabular-nums`}>{recordLabel(row)}</td>
      <td className={`${TD_BASE} text-right tabular-nums`}>{formatPoints(row.pointsFor)}</td>
      <td className={TD_BASE}>
        <Status row={row} />
      </td>
    </tr>
  )
}

export function PlayoffSeedTable({ rows, year, divisions }: { rows: SeedRow[]; year: string; divisions: readonly Division[] }) {
  const divisionName = new Map(divisions.map((d) => [d.id, d.name]))
  const lastIn = rows.filter((r) => r.inPlayoffs).at(-1)?.seed
  return (
    <div className="overflow-x-auto border border-border bg-surface">
      <table className="w-full text-sm">
        <caption className="sr-only">Projected playoff seeds; the line marks the last team in</caption>
        <thead className="bg-accent text-accent-fg">
          <tr>
            <th scope="col" className={`${TH_BASE} text-right`} title="Seed">#</th>
            <th scope="col" className={`${TH_BASE} text-left`}>Team</th>
            <th scope="col" className={`${TH_BASE} text-left`}>Div</th>
            <th scope="col" className={`${TH_BASE} text-left`}>Record</th>
            <th scope="col" className={`${TH_BASE} text-right`} title="Points for, from games played">PF</th>
            <th scope="col" className={`${TH_BASE} text-left`}>
              <span className="sr-only">Status</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <SeedLine
              key={row.memberId}
              row={row}
              year={year}
              lastIn={row.seed === lastIn}
              {...(row.divisionId === undefined ? {} : { divisionName: divisionName.get(row.divisionId) })}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
