import { useMemo, useState } from 'react'
import { DataTableHead, type ReorderConfig } from './DataTableHead'
import { TD_BASE, TEXT_ALIGN, stickyCell, type Column, type SortState } from './tableShared'

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
  reorder,
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
  /** Enable drag-to-reorder on the header (keeps `lockedKey` first). */
  reorder?: ReorderConfig
}) {
  const [sort, setSort] = useState<SortState | undefined>(initialSort)
  const [page, setPage] = useState(0)
  const pinned = (i: number) => stickyCell(stickyFirstColumn, i, false)

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
      {/* fullBleed: frame breaks out to ~full viewport; inside, the box shrinks to the shown columns
          (w-fit) but stays centered with a sensible min width (≈the viewport on phones, else 32rem). */}
      <div className={fullBleed ? 'mx-[calc(50%-50vw+1rem)]' : ''}>
        <div className={`overflow-x-auto border border-border bg-surface shadow-sm ${fullBleed ? 'mx-auto w-fit min-w-[min(100%,32rem)] max-w-full' : ''}`}>
          <table className={`w-max text-sm ${fullBleed ? '' : 'min-w-full'}`}>
            <DataTableHead columns={columns} sort={sort} onToggleSort={toggleSort} stickyFirstColumn={stickyFirstColumn} reorder={reorder} />
            <tbody className="divide-y divide-border">
              {pageRows.map((row, i) => (
                <tr key={getRowKey(row, i)} className="group hover:bg-surface-2">
                  {columns.map((col, ci) => (
                    <td key={col.key} className={`${TD_BASE} ${pinned(ci)} ${col.align && col.align !== 'left' ? TEXT_ALIGN[col.align] : ''}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {pageSize && pageCount > 1 && <Pagination page={clamped} pageCount={pageCount} onPage={setPage} />}
    </div>
  )
}
