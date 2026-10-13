import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LineupModalFrame } from './LineupModalFrame'

// Serve public/data straight off disk, so Compare reads the seasons the site ships.
const modules = import.meta.glob('../../public/data/**/*.json', { eager: true, import: 'default' })
const FILES: Record<string, unknown> = {}
for (const [path, mod] of Object.entries(modules)) FILES[path.replace('../../public', '')] = mod

beforeEach(() => {
  vi.stubGlobal('fetch', (url: string) => {
    const body = FILES[url]
    return Promise.resolve(
      body === undefined ? ({ ok: false, status: 404, json: async () => ({}) } as Response) : ({ ok: true, status: 200, json: async () => body } as Response),
    )
  })
})
afterEach(() => vi.unstubAllGlobals())

function renderModal() {
  render(
    <MemoryRouter>
      <LineupModalFrame title="Week 3" memberIds={['ffu-023', 'ffu-009']} onClose={() => {}}>
        <p>The box score</p>
      </LineupModalFrame>
    </MemoryRouter>,
  )
  return screen.getByRole('dialog', { name: 'Game lineups' })
}

it('puts the Compare switch in the title bar, and a profile link per team at the foot', () => {
  const dialog = renderModal()
  expect(within(dialog.querySelector('header')!).getByRole('button', { name: 'Compare' })).toBeInTheDocument()
  expect(within(dialog.querySelector('footer')!).getAllByRole('link', { name: /profile →/ })).toHaveLength(2)
})

it('swaps the box score for the two teams\' Compare view, and back', async () => {
  const user = userEvent.setup()
  const dialog = renderModal()

  await user.click(within(dialog).getByRole('button', { name: 'Compare' }))
  expect(await within(dialog).findByRole('heading', { name: 'Career' })).toBeInTheDocument()
  expect(within(dialog).queryByText('The box score')).not.toBeVisible()

  await user.click(within(dialog).getByRole('button', { name: 'Matchup' }))
  expect(within(dialog).getByText('The box score')).toBeVisible()
  expect(within(dialog).queryByRole('heading', { name: 'Career' })).not.toBeInTheDocument()
})
