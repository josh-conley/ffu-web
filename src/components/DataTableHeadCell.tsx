import { TEXT_ALIGN, TH_BASE, TH_DENSE, JUSTIFY, ariaSort, type Column, type SortState } from './tableShared'

// The pieces a header cell is built from, shared by the plain header row (DataTableHead) and the
// lazily loaded drag-to-reorder row (DataTableReorderRow).

export interface ThProps<T> {
  col: Column<T>
  sticky: string
  sort?: SortState
  onToggleSort: (c: Column<T>) => void
  dense?: boolean
}

/** Inner header content: a sort button when sortable, else the plain label. `grab` makes the button
 *  show the grab cursor too (so a draggable header reads as draggable over its text, not just edges). */
export function HeadInner<T>({ col, sort, onToggleSort, grab = false }: { col: Column<T>; sort?: SortState; onToggleSort: (c: Column<T>) => void; grab?: boolean }) {
  if (!col.sortValue) return col.header
  const active = sort?.key === col.key
  return (
    <button
      type="button"
      onClick={() => onToggleSort(col)}
      className={`flex w-full items-center gap-1 uppercase tracking-wider select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text ${grab ? 'cursor-grab' : ''} ${JUSTIFY[col.align ?? 'left']}`}
    >
      {col.header}
      {active && <span aria-hidden>{sort?.dir === 'asc' ? '▲' : '▼'}</span>}
    </button>
  )
}

export function PlainTh<T>({ col, sticky, sort, onToggleSort, dense }: ThProps<T>) {
  return (
    <th scope="col" title={col.title} className={`${dense ? TH_DENSE : TH_BASE} ${sticky} ${TEXT_ALIGN[col.align ?? 'left']}`} aria-sort={ariaSort(sort?.key === col.key, sort?.dir)}>
      <HeadInner col={col} sort={sort} onToggleSort={onToggleSort} />
    </th>
  )
}
