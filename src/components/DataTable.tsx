import { useMemo, useState, type ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  /** Provide to make the column sortable (click the header). */
  sortValue?: (row: T) => number | string
  align?: 'left' | 'right'
}

export interface SortState {
  key: string
  dir: 'asc' | 'desc'
}

const TH_BASE = 'px-3 py-2.5 font-bold uppercase tracking-wider text-accent-fg'
const TD_BASE = 'px-3 py-2'

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

/**
 * Generic sortable + paginated table. Column `render` controls display; `sortValue` (optional)
 * enables click-to-sort. Pass a `key` from the parent to remount (reset sort/page) when the
 * dataset changes (e.g. switching record mode). Reused by Records / All-Time / Members.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  initialSort,
  pageSize,
  fullBleed = false,
  stickyFirstColumn = false,
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
}) {
  const [sort, setSort] = useState<SortState | undefined>(initialSort)
  const [page, setPage] = useState(0)

  // First-column pin: needs its own opaque background so scrolled content doesn't show through,
  // plus a seam border. Keep z below the sticky nav (z-20) so it never paints over the header bar;
  // the pinned header cell sits just above the pinned body cells.
  const stickyCell = (i: number, header: boolean) =>
    stickyFirstColumn && i === 0
      ? `sticky left-0 border-r border-border ${header ? 'z-10 bg-accent' : 'z-[5] bg-surface group-hover:bg-surface-2'}`
      : ''

  const sorted = useMemo(() => sortRows(rows, columns, sort), [rows, columns, sort])
  const pageCount = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1
  const clamped = Math.min(page, pageCount - 1)
  const pageRows = pageSize ? sorted.slice(clamped * pageSize, clamped * pageSize + pageSize) : sorted

  function toggleSort(col: Column<T>) {
    if (!col.sortValue) return
    setPage(0)
    setSort((s) => (s?.key === col.key ? { key: col.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: col.key, dir: 'desc' }))
  }

  return (
    <div className="space-y-3">
      <div className={`overflow-x-auto border border-border bg-surface shadow-sm ${fullBleed ? 'mx-[calc(50%-50vw+1rem)]' : ''}`}>
        {/* w-max so columns keep natural width and the box scrolls on narrow screens instead
            of squishing; min-w-full still fills the container on desktop. */}
        <table className="w-max min-w-full text-sm">
          <thead className="bg-accent">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`${TH_BASE} ${stickyCell(i, true)} ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                  aria-sort={sort?.key === col.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  {col.sortValue ? (
                    // Button (not a click-only th) so sorting is keyboard-operable and announced.
                    <button
                      type="button"
                      onClick={() => toggleSort(col)}
                      className={`flex w-full items-center gap-1 uppercase tracking-wider select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text ${col.align === 'right' ? 'justify-end' : ''}`}
                    >
                      {col.header}
                      {sort?.key === col.key && <span aria-hidden>{sort.dir === 'asc' ? '▲' : '▼'}</span>}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pageRows.map((row, i) => (
              <tr key={getRowKey(row, i)} className="group hover:bg-surface-2">
                {columns.map((col, ci) => (
                  <td key={col.key} className={`${TD_BASE} ${stickyCell(ci, false)} ${col.align === 'right' ? 'text-right' : ''}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageSize && pageCount > 1 && <Pagination page={clamped} pageCount={pageCount} onPage={setPage} />}
    </div>
  )
}
