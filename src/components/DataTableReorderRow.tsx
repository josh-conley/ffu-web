import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TEXT_ALIGN, TH_BASE, TH_DENSE, ariaSort, stickyCell, type Column, type SortState } from './tableShared'
import { HeadInner, PlainTh, type ThProps } from './DataTableHeadCell'
import type { ReorderConfig } from './DataTableHead'

// The drag-to-reorder header row, powered by dnd-kit: horizontal-axis only, keyboard-operable, with
// the locked column left static. Its own module so DataTableHead can load it lazily and keep dnd-kit
// out of the main bundle (only /stats reorders columns).

interface ReorderRowProps<T> {
  columns: Column<T>[]
  sort?: SortState
  onToggleSort: (col: Column<T>) => void
  stickyFirstColumn: boolean
  reorder: ReorderConfig
  dense?: boolean
}

function SortableTh<T>({ col, sticky, sort, onToggleSort, dense }: ThProps<T>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.key })
  const style = { transform: CSS.Translate.toString(transform), transition }
  return (
    <th
      ref={setNodeRef}
      style={style}
      scope="col"
      title={col.title}
      className={`${dense ? TH_DENSE : TH_BASE} ${sticky} ${TEXT_ALIGN[col.align ?? 'left']} cursor-grab touch-none ${isDragging ? 'z-20 opacity-70' : ''}`}
      aria-sort={ariaSort(sort?.key === col.key, sort?.dir)}
      {...attributes}
      {...listeners}
      // dnd-kit sets role="button"; keep the cell as a columnheader (the aria-roledescription
      // "sortable" from {...attributes} still tells screen readers it can be moved).
      role="columnheader"
    >
      <HeadInner col={col} sort={sort} onToggleSort={onToggleSort} grab />
    </th>
  )
}

export function ReorderRow<T>({ columns, sort, onToggleSort, stickyFirstColumn, reorder, dense }: ReorderRowProps<T>) {
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
              <PlainTh key={col.key} col={col} sticky={sticky} sort={sort} onToggleSort={onToggleSort} dense={dense} />
            ) : (
              <SortableTh key={col.key} col={col} sticky={sticky} sort={sort} onToggleSort={onToggleSort} dense={dense} />
            )
          })}
        </tr>
      </SortableContext>
    </DndContext>
  )
}
