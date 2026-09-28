import type { ReactNode } from 'react'

// Shared primitives for DataTable + DataTableHead (kept in a leaf module so the two can import
// them without a circular dependency).

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  /** Provide to make the column sortable (click the header). */
  sortValue?: (row: T) => number | string
  align?: 'left' | 'right' | 'center'
  /** Tooltip on the header (e.g. expanding an abbreviation like "PF"). */
  title?: string
  /** `fit` tables only: a fixed CSS width for this column. Columns without one share what's left. */
  width?: string
}

export interface SortState {
  key: string
  dir: 'asc' | 'desc'
}

// Text color intentionally lives on <thead> (DataTableHead), not here, so a caller can recolor the
// whole header (bg + text) in one place and every <th> just inherits it.
export const TH_BASE = 'px-3 py-2.5 font-bold uppercase tracking-wider'
export const TD_BASE = 'px-3 py-2'
// `fit` tables give every pixel of padding back to the one column that needs it (the team name),
// so they run tighter than a table that can afford to scroll.
export const TH_DENSE = 'px-2 py-2 font-bold uppercase tracking-wider'
export const TD_DENSE = 'px-2 py-1.5 align-middle'
export const TEXT_ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' } as const
export const JUSTIFY = { left: '', right: 'justify-end', center: 'justify-center' } as const

// First-column pin: opaque background so scrolled content doesn't show through, a seam border, and
// z kept below the sticky nav (z-20) so it never paints over the header bar. The pinned header cell
// (z-10) sits just above the pinned body cells (z-5).
export function stickyCell(enabled: boolean, i: number, header: boolean): string {
  if (!enabled || i !== 0) return ''
  return `sticky left-0 border-r border-border ${header ? 'z-10 bg-accent' : 'z-[5] bg-surface group-hover:bg-surface-2'}`
}

/** The `aria-sort` value for a header cell: set only on the active sort column. */
export const ariaSort = (active: boolean, dir?: 'asc' | 'desc') => (active ? (dir === 'asc' ? 'ascending' : 'descending') : undefined)
