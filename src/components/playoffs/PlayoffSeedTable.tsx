import { FaCircleInfo } from 'react-icons/fa6'
import type { Division } from '@/data'
import type { ClinchStatus, SeedRow, TiebreakStep } from '@/selectors'
import { nameForYear } from '@/config'
import { InfoPopover } from '../InfoPopover'
import { TeamLink } from '../TeamLink'
import { TD_BASE, TH_BASE } from '../tableShared'
import { formatPoints, recordLabel } from '../format'
import { TiebreakDetail } from './TiebreakDetail'
import { CLINCH } from './clinchMarks'

// The projected seeds, with the playoff line drawn under the last seed in. A plain table rather
// than DataTable: the order IS the content (re-sorting by points would hide the seeding), and it
// needs the cut line, which DataTable has no notion of. The by-division view reuses it per
// division, ordered by place in the division and without the line.
//
// On a phone the Div column folds into a line under the team name and the cells tighten, so the
// table needs little or no sideways scroll; it stays a table (a pinned layout, not cards).

const STEP_LABEL: Record<TiebreakStep, string> = { h2h: 'H2H', points: 'PF' }

/** A cell: the shared padding from sm up, tighter on a phone. */
const TD = `${TD_BASE} max-sm:px-1.5`
const TH = `${TH_BASE} max-sm:px-1.5`

const CHIP = 'inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide'

function ClinchMark({ status }: { status: ClinchStatus | undefined }) {
  if (status === undefined) return <span className="inline-block w-3" aria-hidden />
  const { mark, label } = CLINCH[status]
  return (
    <span title={label} className={`inline-block w-3 text-xs font-extrabold ${status === 'eliminated' ? 'text-negative' : 'text-positive'}`}>
      <span aria-hidden>{mark}</span>
      <span className="sr-only">{label}:</span>
    </span>
  )
}

/** The tiebreak chip: the step that placed the team in its seeding pool (or, failing that, its division). */
function TiebreakChip({ row, year, divisionName }: { row: SeedRow; year: string; divisionName?: string }) {
  if (row.tiebreaks.length === 0) return null
  const main = row.tiebreaks.find((t) => t.context !== 'division') ?? row.tiebreaks[0]!
  return (
    <InfoPopover
      label={`How ${nameForYear(row.memberId, year) ?? row.memberId}'s tie was broken`}
      triggerClassName={`${CHIP} cursor-pointer border-border text-muted hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
      trigger={
        <>
          {STEP_LABEL[main.step]}
          <FaCircleInfo aria-hidden className="h-2.5 w-2.5" />
        </>
      }
    >
      <TiebreakDetail ties={row.tiebreaks} memberId={row.memberId} year={year} {...(divisionName === undefined ? {} : { divisionName })} />
    </InfoPopover>
  )
}

function Notes({ row, year, divisionName }: { row: SeedRow; year: string; divisionName?: string }) {
  return (
    <span className="flex flex-wrap items-center gap-1">
      {row.bye && <span className={`${CHIP} border-positive text-positive`}>Bye</span>}
      {row.divisionWinner && <span className={`${CHIP} border-border text-text`}>Div. winner</span>}
      {row.guaranteedSpot && (
        <span className={`${CHIP} border-notable text-notable`} title="Division winner: guaranteed a playoff spot">
          Guaranteed
        </span>
      )}
      <TiebreakChip row={row} year={year} {...(divisionName === undefined ? {} : { divisionName })} />
    </span>
  )
}

interface LineProps {
  row: SeedRow
  year: string
  divisionName?: string
  clinch: ClinchStatus | undefined
  lastIn: boolean
}

function SeedLine({ row, year, divisionName, clinch, lastIn }: LineProps) {
  const named = divisionName === undefined ? {} : { divisionName }
  return (
    <tr className={`${lastIn ? 'border-b-2 border-b-accent' : 'border-b border-border'} ${row.inPlayoffs ? '' : 'text-muted'}`}>
      <td className={`${TD} text-right font-bold tabular-nums`}>{row.seed}</td>
      <td className={`${TD} relative`}>
        <span className="flex items-center gap-1.5">
          <ClinchMark status={clinch} />
          <TeamLink
            ffuId={row.memberId}
            className="gap-2 font-semibold"
            detail={divisionName === undefined ? undefined : <span className="text-[11px] font-normal text-muted sm:hidden">{divisionName}</span>}
          >
            <span className="max-sm:max-w-32 max-sm:truncate sm:whitespace-nowrap">{nameForYear(row.memberId, year) ?? row.memberId}</span>
          </TeamLink>
        </span>
      </td>
      <td className={`${TD} whitespace-nowrap max-sm:hidden`}>{divisionName ?? '—'}</td>
      <td className={`${TD} whitespace-nowrap tabular-nums`}>{recordLabel(row)}</td>
      <td className={`${TD} text-right tabular-nums`}>{formatPoints(row.pointsFor)}</td>
      <td className={TD}>
        <Notes row={row} year={year} {...named} />
      </td>
    </tr>
  )
}

export function PlayoffSeedTable({ rows, year, divisions, clinches, caption, cutLine = true }: {
  rows: SeedRow[]
  year: string
  divisions: readonly Division[]
  clinches: ReadonlyMap<string, ClinchStatus>
  caption: string
  /** Draw the line under the last playoff seed (the seeds view; off for a division's table). */
  cutLine?: boolean
}) {
  const divisionName = new Map(divisions.map((d) => [d.id, d.name]))
  const lastIn = cutLine ? rows.filter((r) => r.inPlayoffs).at(-1)?.seed : undefined
  return (
    <div className="overflow-x-auto border border-border bg-surface">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-accent text-accent-fg">
          <tr>
            <th scope="col" className={`${TH} text-right`} title="Seed">#</th>
            <th scope="col" className={`${TH} text-left`}>Team</th>
            <th scope="col" className={`${TH} text-left max-sm:hidden`}>Div</th>
            <th scope="col" className={`${TH} text-left`}>
              <span className="sm:hidden" aria-hidden>W-L</span>
              <span className="max-sm:sr-only">Record</span>
            </th>
            <th scope="col" className={`${TH} text-right`} title="Points for, from games played">PF</th>
            <th scope="col" className={`${TH} text-left`}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const name = row.divisionId === undefined ? undefined : divisionName.get(row.divisionId)
            return (
              <SeedLine
                key={row.memberId}
                row={row}
                year={year}
                clinch={clinches.get(row.memberId)}
                lastIn={row.seed === lastIn}
                {...(name === undefined ? {} : { divisionName: name })}
              />
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
