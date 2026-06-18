import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RecordBook } from './RecordBook'

const modules = import.meta.glob('../../public/data/**/*.json', { eager: true, import: 'default' })
const FILES: Record<string, unknown> = {}
for (const [path, mod] of Object.entries(modules)) FILES[path.replace('../../public', '')] = mod

afterEach(() => vi.unstubAllGlobals())

it('computes the record book from real season data', async () => {
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
      <RecordBook />
    </MemoryRouter>,
  )

  await waitFor(() => expect(screen.getByText('FFU Record Book')).toBeInTheDocument())
  expect(screen.getByText('Regular Season')).toBeInTheDocument()

  // The pipeline ran end-to-end against real data and produced a non-zero, sane coverage count.
  const note = await screen.findByText(/records computed/)
  const [, filled, total] = note.textContent?.match(/(\d+) of (\d+)/) ?? []
  expect(Number(filled)).toBeGreaterThan(0)
  expect(Number(total)).toBeGreaterThanOrEqual(Number(filled))
})
