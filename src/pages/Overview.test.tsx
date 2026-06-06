import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Overview } from './Overview'

const modules = import.meta.glob('../../public/data/**/*.json', { eager: true, import: 'default' })
const FILES: Record<string, unknown> = {}
for (const [path, mod] of Object.entries(modules)) FILES[path.replace('../../public', '')] = mod

afterEach(() => vi.unstubAllGlobals())

it('renders champions grouped by league', async () => {
  vi.stubGlobal('fetch', (url: string) => {
    const body = FILES[url]
    return Promise.resolve(
      body === undefined
        ? ({ ok: false, status: 404, json: async () => ({}) } as Response)
        : ({ ok: true, status: 200, json: async () => body } as Response),
    )
  })

  render(
    <MemoryRouter>
      <Overview />
    </MemoryRouter>,
  )
  await waitFor(() => expect(screen.getByText('Champions by Season')).toBeInTheDocument())
  // 2024 Premier champion (ffu-009) shows its current name.
  expect(screen.getAllByText('Fort Wayne Banana Bread').length).toBeGreaterThan(0)
})
