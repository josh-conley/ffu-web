import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './Layout'

function renderAt(path: string) {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="records" element={<h1>Records</h1>} />
          <Route path="cup" element={<h1>FFU Cup</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
  return user
}

describe('Layout', () => {
  it('puts "Skip to content" first in the tab order, and it moves focus to the main region', async () => {
    const user = renderAt('/records')
    await user.tab()
    const skip = screen.getByRole('link', { name: 'Skip to content' })
    expect(skip).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('main')).toHaveFocus()
  })

  it("sets the tab title for the route and updates it on navigation", async () => {
    const user = renderAt('/records')
    await waitFor(() => expect(document.title).toBe('Records · FFU'))
    await user.click(screen.getByRole('link', { name: 'FFU Cup' }))
    await waitFor(() => expect(document.title).toBe('FFU Cup · FFU'))
    expect(screen.getByRole('heading', { name: 'FFU Cup' })).toHaveFocus()
  })
})
