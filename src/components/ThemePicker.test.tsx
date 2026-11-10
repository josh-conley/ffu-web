import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setTheme, setThemeSound } from '@/themes/themeStore'
import { ThemePicker } from './ThemePicker'

// Start from a known theme: during a holiday week the store would otherwise open on that skin.
beforeEach(() => setTheme('light'))
afterEach(async () => {
  await setTheme('light')
  setThemeSound(false)
})

describe('ThemePicker', () => {
  it('lists the themes behind one button and marks the current one', async () => {
    const user = userEvent.setup()
    render(<ThemePicker />)
    expect(screen.queryByRole('button', { name: 'Arcade' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Theme' }))
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Windows XP' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('switches the whole document when a theme is picked', async () => {
    const user = userEvent.setup()
    render(<ThemePicker />)
    await user.click(screen.getByRole('button', { name: 'Theme' }))
    await user.click(screen.getByRole('button', { name: 'Arcade' }))

    expect(await screen.findByRole('button', { name: 'Arcade', pressed: true })).toBeInTheDocument()
    expect(document.documentElement.dataset.theme).toBe('arcade')
  })

  it('keeps two mounted pickers (desktop and mobile bars) in agreement', async () => {
    const user = userEvent.setup()
    render(
      <>
        <ThemePicker />
        <ThemePicker />
      </>,
    )
    const [first, second] = screen.getAllByRole('button', { name: 'Theme' })
    await user.click(first!)
    await user.click(screen.getByRole('button', { name: 'Dark' }))
    await user.keyboard('{Escape}')

    await user.click(second!)
    expect(await screen.findByRole('button', { name: 'Dark', pressed: true })).toBeInTheDocument()
  })

  it('has sound off by default, behind a switch', async () => {
    const user = userEvent.setup()
    render(<ThemePicker />)
    await user.click(screen.getByRole('button', { name: 'Theme' }))
    const sound = screen.getByRole('switch', { name: /Theme sounds/ })
    expect(sound).toHaveAttribute('aria-checked', 'false')

    await user.click(sound)
    expect(sound).toHaveAttribute('aria-checked', 'true')
  })
})
