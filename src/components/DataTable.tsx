import { Fragment, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { DataTableHead, type ReorderConfig } from './DataTableHead'
import { TD_BASE, TD_DENSE, TEXT_ALIGN, stickyCell, type Column, type SortState } from './tableShared'

export type { Column, SortState } from './tableShared'

function sortRows<T>(rows: T[], columns: Column<T>[], sort: SortState | undefined): T[] {
  const col = sort ? columns.find((c) => c.key === sort.key) : undefined
  if (!sort || !col?.sortValue) return rows
  const value = col.sortValue
  const dir = sort.dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const av = value(a)
    const bv = value(b)
    return av < bv ? -dir : av > bv ? dir : 0
  })
}

function Pagination({ page, pageCount, onPage }: { page: number; pageCount: number; onPage: (p: number) => void }) {
  const btn =
    'inline-flex items-center rounded-md border border-border px-3 py-1.5 hover:bg-surface-2 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:px-2 md:py-1'
  return (
    <div className="flex items-center justify-end gap-3 text-sm text-muted">
      <span>
        Page {page + 1} of {pageCount}
      </span>
      <button type="button" className={btn} onClick={() => onPage(page - 1)} disabled={page === 0}>
        Prev
      </button>
      <button type="button" className={btn} onClick={() => onPage(page + 1)} disabled={page >= pageCount - 1}>
        Next
      </button>
    </div>
  )
}

/** One table row — extracted so click/keyboard row semantics don't bloat DataTable's body. */
function DataRow<T>({
  row,
  columns,
  pinned,
  selected,
  onRowClick,
  cellBase,
}: {
  row: T
  columns: Column<T>[]
  pinned: (i: number) => string
  selected: boolean
  onRowClick?: (row: T) => void
  cellBase: string
}) {
  const interactive = onRowClick
    ? {
        role: 'button',
        tabIndex: 0,
        'aria-pressed': selected,
        onClick: () => onRowClick(row),
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onRowClick(row)
          }
        },
      }
    : {}
  return (
    <tr className={`group hover:bg-surface-2 ${onRowClick ? 'cursor-pointer' : ''} ${selected ? 'bg-surface-2' : ''}`} {...interactive}>
      {columns.map((col, ci) => (
        <td key={col.key} className={`${cellBase} ${pinned(ci)} ${col.align && col.align !== 'left' ? TEXT_ALIGN[col.align] : ''}`}>
          {col.render(row)}
        </td>
      ))}
    </tr>
  )
}

/**
 * The two sizing modes, in one place: `fit` sizes the table to its CONTAINER (fixed layout, no
 * horizontal scroll), anything else sizes it to its CONTENT and scrolls the box.
 */
function frameClasses(fit: boolean, fullBleed: boolean, expandable: boolean) {
  return {
    // fullBleed: frame breaks out to ~full viewport; inside, the box shrinks to the shown columns
    // (w-fit) but stays centered with a sensible min width (≈the viewport on phones, else 32rem).
    outer: fullBleed ? 'mx-[calc(50%-50vw+1rem)]' : '',
    // container-type so an expanded row can size to the VISIBLE width (100cqw) and wrap, rather
    // than riding the table's (possibly wider, horizontally-scrolled) width.
    box: `${fit ? 'overflow-hidden' : 'overflow-x-auto'} border border-border bg-surface shadow-sm ${expandable ? '[container-type:inline-size]' : ''} ${fullBleed ? 'mx-auto w-fit min-w-[min(100%,32rem)] max-w-full' : ''}`,
    // fit runs a size down: three of these share one row, and the ~15% more characters per line
    // is the difference between a team name fitting and wrapping.
    table: fit ? 'w-full table-fixed text-xs' : `w-max text-sm ${fullBleed ? '' : 'min-w-full'}`,
  }
}

/** A row's expanded detail, as a full-width row under it. Sticky-left + container-width so it stays
 *  in view and wraps to the VISIBLE area even while the columns scroll horizontally. */
function ExpandedRow({ span, children }: { span: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={span} className="p-0">
        <div className="sticky left-0 box-border w-[100cqw] bg-surface-2 p-2">{children}</div>
      </td>
    </tr>
  )
}

/** `table-fixed` takes its widths from the first row, so a fit table states them once, up front. */
function ColGroup<T>({ columns }: { columns: Column<T>[] }) {
  return (
    <colgroup>
      {columns.map((col) => (
        <col key={col.key} style={col.width ? { width: col.width } : undefined} />
      ))}
    </colgroup>
  )
}

/**
 * Generic sortable + paginated table. Column `render` controls display; `sortValue` (optional)
 * enables click-to-sort. Pass a `key` from the parent to remount (reset sort/page) when the
 * dataset changes (e.g. switching record mode). Reused by Records / Stats / Members.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  initialSort,
  pageSize,
  fullBleed = false,
  stickyFirstColumn = false,
  fit = false,
  reorder,
  headerClassName,
  onRowClick,
  selectedRowKey,
  expandedRowKey,
  renderExpanded,
}: {
  columns: Column<T>[]
  rows: T[]
  getRowKey: (row: T, index: number) => string
  initialSort?: SortState
  pageSize?: number
  /** Break out of the page's centered container to (nearly) full viewport width. */
  fullBleed?: boolean
  /** Pin the first column so it stays visible while the rest scrolls horizontally. */
  stickyFirstColumn?: boolean
  /**
   * Size the table to its CONTAINER rather than to its content: fixed layout, dense cells, and no
   * horizontal scroll at any width. Columns keep the `width` they declare and the rest share what
   * is left, wrapping their text instead of widening. For tables that have to sit in a narrow
   * column and still show every column — the home page's three standings blocks (see
   * CurrentWeekStandings). Everything else scrolls, which is the right trade for a wide table.
   */
  fit?: boolean
  /** Enable drag-to-reorder on the header (keeps `lockedKey` first). */
  reorder?: ReorderConfig
  /** Overrides the header's default accent color (e.g. a tier's solidHeader pairing). */
  headerClassName?: string
  /** Makes rows clickable (button semantics + keyboard) — e.g. to drill into a row's detail. */
  onRowClick?: (row: T) => void
  /** Key of the currently selected row (highlighted); pair with `onRowClick`. */
  selectedRowKey?: string
  /** Key of the row whose expanded detail is open (accordion). */
  expandedRowKey?: string
  /** Renders the expanded detail as a full-width row directly under `expandedRowKey`'s row. */
  renderExpanded?: (row: T) => ReactNode
}) {
  const [sort, setSort] = useState<SortState | undefined>(initialSort)
  const [page, setPage] = useState(0)
  const pinned = (i: number) => stickyCell(stickyFirstColumn && !fit, i, false)
  const cellBase = fit ? TD_DENSE : TD_BASE

  const sorted = useMemo(() => sortRows(rows, columns, sort), [rows, columns, sort])
  const pageCount = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1
  const clamped = Math.min(page, pageCount - 1)
  const pageRows = pageSize ? sorted.slice(clamped * pageSize, clamped * pageSize + pageSize) : sorted

  function toggleSort(col: Column<T>) {
    if (!col.sortValue) return
    setPage(0)
    setSort((s) => (s?.key === col.key ? { key: col.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: col.key, dir: 'desc' }))
  }

  const frame = frameClasses(fit, fullBleed, renderExpanded !== undefined)

  return (
    <div className="space-y-3">
      <div className={frame.outer}>
        <div className={frame.box}>
          <table className={frame.table}>
            {fit && <ColGroup columns={columns} />}
            <DataTableHead columns={columns} sort={sort} onToggleSort={toggleSort} stickyFirstColumn={stickyFirstColumn && !fit} reorder={reorder} headerClassName={headerClassName} dense={fit} />
            <tbody className="divide-y divide-border">
              {pageRows.map((row, i) => {
                const key = getRowKey(row, i)
                const expanded = renderExpanded !== undefined && key === expandedRowKey
                return (
                  <Fragment key={key}>
                    <DataRow row={row} columns={columns} pinned={pinned} selected={selectedRowKey !== undefined && key === selectedRowKey} onRowClick={onRowClick} cellBase={cellBase} />
                    {expanded && <ExpandedRow span={columns.length}>{renderExpanded(row)}</ExpandedRow>}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      {pageSize && pageCount > 1 && <Pagination page={clamped} pageCount={pageCount} onPage={setPage} />}
    </div>
  )
}
