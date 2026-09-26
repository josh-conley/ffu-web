import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Members } from './Members'

// Its own file on purpose: the provider caches every file it fetches for the life of the module,
// so in a file that has already opened a member page the lineups would be cached and "not fetched
// yet" would pass for the wrong reason.

const modules = import.meta.glob('../../public/data/**/*.json', { eager: true, import: 'default' })
const FILES: Record<string, unknown> = {}
for (const [path, mod] of Object.entries(modules)) FILES[path.replace('../../public', '')] = mod

afterEach(() => vi.unstubAllGlobals())

// Franchise players needs every lineup file (~240KB gzipped), so it must wait until the section is
// scrolled near — never on the page's first render.
it('loads franchise players only once their section comes into view', async () => {
  const requested: string[] = []
  vi.stubGlobal('fetch', (url: string) => {
    requested.push(url)
    const body = FILES[url]
    return Promise.resolve({ ok: body !== undefined, status: body === undefined ? 404 : 200, json: async () => body ?? {} } as Response)
  })
  let reveal: (() => void) | undefined
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: IntersectionObserverCallback) {
        reveal = () => cb([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
      }
      observe() {}
      disconnect() {}
    },
  )
  render(
    <MemoryRouter initialEntries={['/members?member=ffu-028']}>
      <Routes>
        <Route path="members" element={<Members />} />
      </Routes>
    </MemoryRouter>,
  )
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Milestones' })).toBeInTheDocument())
  expect(requested.some((u) => u.endsWith('.lineups.json'))).toBe(false)

  act(() => reveal?.())
  const allen = await screen.findByRole('link', { name: 'Josh Allen' })
  expect(allen).toHaveAttribute('href', '/players?q=Josh%20Allen')
  expect(requested.some((u) => u.endsWith('.lineups.json'))).toBe(true)
})
