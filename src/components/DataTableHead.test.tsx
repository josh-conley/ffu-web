import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DataTableHead } from './DataTableHead'
import type { Column } from './tableShared'

type Row = { name: string; pts: number }
const columns: Column<Row>[] = [
  { key: 'name', header: 'Team', render: (r) => r.name },
  { key: 'pts', header: 'PF', render: (r) => r.pts, sortValue: (r) => r.pts },
  { key: 'pa', header: 'PA', render: () => 0 },
]

function renderHead(reorder?: { lockedKey: string; onReorder: (keys: string[]) => void }) {
  return render(
    <table>
      <DataTableHead columns={columns} onToggleSort={() => {}} stickyFirstColumn reorder={reorder} />
    </table>,
  )
}

describe('DataTableHead', () => {
  it('renders a plain header row without loading the reorder chunk', () => {
    renderHead()
    expect(screen.getAllByRole('columnheader')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'PF' })).toBeInTheDocument()
  })

  it('swaps in the lazily loaded drag-to-reorder row, leaving the locked column static', async () => {
    renderHead({ lockedKey: 'name', onReorder: vi.fn() })
    // The plain row stands in while the chunk loads, so the headers are there from the start.
    expect(screen.getAllByRole('columnheader')).toHaveLength(3)
    const sortableHeaders = () =>
      screen.getAllByRole('columnheader').filter((th) => th.getAttribute('aria-roledescription') === 'sortable')
    await vi.waitFor(() => expect(sortableHeaders().map((th) => th.textContent)).toEqual(['PF', 'PA']))
  })
})
