import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef } from 'react'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { focusHeadingWhenReady, useRouteFocus } from './useRouteFocus'

describe('focusHeadingWhenReady', () => {
  afterEach(() => vi.useRealTimers())

  it('focuses a heading that is already there, without adding it to the tab order', () => {
    const main = document.createElement('main')
    main.innerHTML = '<h1>Records</h1>'
    document.body.append(main)
    focusHeadingWhenReady(main)
    const h1 = main.querySelector('h1')!
    expect(h1).toHaveFocus()
    expect(h1).toHaveAttribute('tabindex', '-1')
    main.remove()
  })

  it('waits for a heading that renders later (a page behind a spinner)', async () => {
    const main = document.createElement('main')
    document.body.append(main)
    focusHeadingWhenReady(main)
    main.innerHTML = '<h1>Standings</h1>'
    await act(async () => {})
    expect(main.querySelector('h1')).toHaveFocus()
    main.remove()
  })

  it('settles on the container when no heading ever arrives', () => {
    vi.useFakeTimers()
    const main = document.createElement('main')
    document.body.append(main)
    focusHeadingWhenReady(main, 100)
    vi.advanceTimersByTime(100)
    expect(main).toHaveFocus()
    main.remove()
  })
})

function Shell() {
  const ref = useRef<HTMLElement>(null)
  useRouteFocus(ref)
  return (
    <>
      <Link to="/b">to B</Link>
      <Link to="/a?x=1">filter A</Link>
      <main ref={ref}>
        <Routes>
          <Route path="/a" element={<h1>Page A</h1>} />
          <Route path="/b" element={<h1>Page B</h1>} />
        </Routes>
      </main>
    </>
  )
}

describe('useRouteFocus', () => {
  it('leaves focus alone on first load and on query-only changes, and moves it on navigation', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/a']}>
        <Shell />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Page A' })).not.toHaveFocus()

    await user.click(screen.getByRole('link', { name: 'filter A' }))
    expect(screen.getByRole('link', { name: 'filter A' })).toHaveFocus()

    await user.click(screen.getByRole('link', { name: 'to B' }))
    expect(screen.getByRole('heading', { name: 'Page B' })).toHaveFocus()
  })
})
