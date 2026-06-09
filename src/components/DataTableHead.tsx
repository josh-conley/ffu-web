import type { ReactNode } from 'react'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { JUSTIFY, TEXT_ALIGN, TH_BASE, stickyCell, type Column, type SortState } from './tableShared'

// The table header, in two flavors: a plain row, or (when `reorder` is given) a drag-to-reorder row
// powered by dnd-kit — horizontal-axis only, keyboard-operable, with the locked column left static.

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
}

const ariaSort = (active: boolean, dir?: 'asc' | 'desc') => (active ? (dir === 'asc' ? 'ascending' : 'descending') : undefined)

/** Inner header content: a sort button when sortable, else the plain label. `grab` makes the button
 *  show the grab cursor too (so a draggable header reads as draggable over its text, not just edges). */
function headInner<T>(col: Column<T>, sort: SortState | undefined, onToggleSort: (c: Column<T>) => void, grab = false): ReactNode {
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

function PlainTh<T>({ col, sticky, sort, onToggleSort }: { col: Column<T>; sticky: string; sort?: SortState; onToggleSort: (c: Column<T>) => void }) {
  return (
    <th scope="col" title={col.title} className={`${TH_BASE} ${sticky} ${TEXT_ALIGN[col.align ?? 'left']}`} aria-sort={ariaSort(sort?.key === col.key, sort?.dir)}>
      {headInner(col, sort, onToggleSort)}
    </th>
  )
}

function SortableTh<T>({ col, sticky, sort, onToggleSort }: { col: Column<T>; sticky: string; sort?: SortState; onToggleSort: (c: Column<T>) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.key })
  const style = { transform: CSS.Translate.toString(transform), transition }
  return (
    <th
      ref={setNodeRef}
      style={style}
      scope="col"
      className={`${TH_BASE} ${sticky} ${TEXT_ALIGN[col.align ?? 'left']} cursor-grab touch-none ${isDragging ? 'z-20 opacity-70' : ''}`}
      aria-sort={ariaSort(sort?.key === col.key, sort?.dir)}
      {...attributes}
      {...listeners}
      // dnd-kit sets role="button"; keep the cell as a columnheader (the aria-roledescription
      // "sortable" from {...attributes} still tells screen readers it can be moved).
      role="columnheader"
    >
      {headInner(col, sort, onToggleSort, true)}
    </th>
  )
}

function ReorderRow<T>({ columns, sort, onToggleSort, stickyFirstColumn, reorder }: HeadProps<T> & { reorder: ReorderConfig }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const movable = columns.filter((c) => c.key !== reorder.lockedKey).map((c) => c.key)
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = movable.indexOf(String(active.id))
    const to = movable.indexOf(String(over.id))
    if (from >= 0 && to >= 0) reorder.onReorder(arrayMove(movable, from, to))
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToHorizontalAxis]} onDragEnd={onDragEnd}>
      <SortableContext items={movable} strategy={horizontalListSortingStrategy}>
        <tr>
          {columns.map((col, i) => {
            const sticky = stickyCell(stickyFirstColumn, i, true)
            return col.key === reorder.lockedKey ? (
              <PlainTh key={col.key} col={col} sticky={sticky} sort={sort} onToggleSort={onToggleSort} />
            ) : (
              <SortableTh key={col.key} col={col} sticky={sticky} sort={sort} onToggleSort={onToggleSort} />
            )
          })}
        </tr>
      </SortableContext>
    </DndContext>
  )
}

export function DataTableHead<T>(props: HeadProps<T>) {
  const { columns, sort, onToggleSort, stickyFirstColumn, reorder } = props
  return (
    <thead className="bg-accent">
      {reorder ? (
        <ReorderRow {...props} reorder={reorder} />
      ) : (
        <tr>
          {columns.map((col, i) => (
            <PlainTh key={col.key} col={col} sticky={stickyCell(stickyFirstColumn, i, true)} sort={sort} onToggleSort={onToggleSort} />
          ))}
        </tr>
      )}
    </thead>
  )
}
