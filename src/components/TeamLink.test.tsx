import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { TeamProfileContext } from './teamProfile'
import { TeamLink } from './TeamLink'

// ffu-001 is The Stallions (STA).
const withProfile = (open: (ffuId: string) => void) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <TeamProfileContext.Provider value={open}>{children}</TeamProfileContext.Provider>
  }

describe('TeamLink', () => {
  it('is one button named by the team, opening its profile dialog', async () => {
    const open = vi.fn()
    render(<TeamLink ffuId="ffu-001">The Stallions</TeamLink>, { wrapper: withProfile(open) })
    const button = screen.getByRole('button', { name: 'The Stallions' })
    expect(button).toHaveAttribute('aria-haspopup', 'dialog')
    await userEvent.click(button)
    expect(open).toHaveBeenCalledWith('ffu-001')
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('keeps the detail line out of the name', () => {
    render(<TeamLink ffuId="ffu-001" detail={<span>142.30 · Premier</span>}>The Stallions</TeamLink>, { wrapper: withProfile(vi.fn()) })
    expect(screen.getByRole('button', { name: 'The Stallions' })).toBeInTheDocument()
    expect(screen.getByText('142.30 · Premier')).toBeInTheDocument()
  })

  it('takes a full-name label when the visible text is an abbreviation', () => {
    render(<TeamLink ffuId="ffu-001" label="The Stallions">STA</TeamLink>, { wrapper: withProfile(vi.fn()) })
    expect(screen.getByRole('button', { name: 'The Stallions' })).toBeInTheDocument()
  })

  it('is plain text inside another control, and when no profile can open', () => {
    const { unmount } = render(<TeamLink ffuId="ffu-001" plain>The Stallions</TeamLink>, { wrapper: withProfile(vi.fn()) })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('The Stallions')).toBeInTheDocument()
    unmount()
    render(<TeamLink ffuId="ffu-001">The Stallions</TeamLink>)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
