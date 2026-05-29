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
  const btn = 'rounded-md border border-border px-2 py-1 hover:bg-surface-2 disabled:opacity-40'
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
}: {
  columns: Column<T>[]
  rows: T[]
  getRowKey: (row: T, index: number) => string
  initialSort?: SortState
  pageSize?: number
}) {
  const [sort, setSort] = useState<SortState | undefined>(initialSort)
  const [page, setPage] = useState(0)

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
      <div className="overflow-x-auto border border-border bg-surface shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-accent">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${TH_BASE} ${col.align === 'right' ? 'text-right' : 'text-left'} ${col.sortValue ? 'cursor-pointer select-none' : ''}`}
                  onClick={() => toggleSort(col)}
                  aria-sort={sort?.key === col.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  {col.header}
                  {sort?.key === col.key && <span aria-hidden> {sort.dir === 'asc' ? '▲' : '▼'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pageRows.map((row, i) => (
              <tr key={getRowKey(row, i)} className="hover:bg-surface-2">
                {columns.map((col) => (
                  <td key={col.key} className={`${TD_BASE} ${col.align === 'right' ? 'text-right' : ''}`}>
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
