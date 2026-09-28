import { lazy, Suspense } from 'react'
import { TH_BASE, TH_DENSE, stickyCell, type Column, type SortState } from './tableShared'
import { PlainTh } from './DataTableHeadCell'

// The table header, in two flavors: a plain row, or (when `reorder` is given) a drag-to-reorder row.
// The reorder row brings dnd-kit, which only /stats uses, so it's loaded on demand; the plain row
// stands in while it loads (same cells, so nothing shifts).
// `lazy` erases the component's generic `<T>`, so restore its real signature for the call site.
const ReorderRow = lazy(() => import('./DataTableReorderRow').then((m) => ({ default: m.ReorderRow }))) as unknown as
  typeof import('./DataTableReorderRow').ReorderRow

export interface ReorderConfig {
  /** Column that stays first and is not draggable (the pinned Team column). */
  lockedKey: string
  /** Receives the new left-to-right order of the draggable (non-locked) column keys. */
  onReorder: (keys: string[]) => void
}

interface HeadProps<T> {
  columns: Column<T>[]
  sort?: SortState
  onToggleSort: (col: Column<T>) => void
  stickyFirstColumn: boolean
  reorder?: ReorderConfig
  /** Overrides the default `bg-accent text-accent-fg` (e.g. a tier's solidHeader pairing). */
  headerClassName?: string
  /** Tighter cells, for a table that has to fit its container (see DataTable's `fit`). */
  dense?: boolean
  /** Replaces the per-column headers with one band naming the table (see DataTable's `heading`). */
  heading?: string
}

function PlainRow<T>({ columns, sort, onToggleSort, stickyFirstColumn, dense }: HeadProps<T>) {
  return (
    <tr>
      {columns.map((col, i) => (
        <PlainTh key={col.key} col={col} sticky={stickyCell(stickyFirstColumn, i, true)} sort={sort} onToggleSort={onToggleSort} dense={dense} />
      ))}
    </tr>
  )
}

export function DataTableHead<T>(props: HeadProps<T>) {
  const { columns, reorder, headerClassName, dense, heading } = props
  return (
    <thead className={headerClassName ?? 'bg-accent text-accent-fg'}>
      {heading !== undefined ? (
        // One band across the table instead of a label per column: `scope="colgroup"` so a screen
        // reader still announces it for every cell under it.
        <tr>
          <th scope="colgroup" colSpan={columns.length} className={`${dense ? TH_DENSE : TH_BASE} text-left`}>
            {heading}
          </th>
        </tr>
      ) : reorder ? (
        <Suspense fallback={<PlainRow {...props} />}>
          <ReorderRow {...props} reorder={reorder} />
        </Suspense>
      ) : (
        <PlainRow {...props} />
      )}
    </thead>
  )
}
