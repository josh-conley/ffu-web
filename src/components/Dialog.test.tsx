import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode, useState } from 'react'
import { Dialog } from './Dialog'

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open it</button>
      {open && (
        <Dialog label="Test dialog" title="Title" onClose={() => setOpen(false)}>
          <p>Body</p>
        </Dialog>
      )}
    </>
  )
}

async function openDialog() {
  const user = userEvent.setup()
  render(<Harness />)
  await user.click(screen.getByRole('button', { name: 'Open it' }))
  return user
}

describe('Dialog', () => {
  afterEach(() => document.documentElement.style.removeProperty('overflow'))

  it('opens as a modal with focus on the close button and the page scroll locked', async () => {
    await openDialog()
    const dialog = screen.getByRole('dialog', { name: 'Test dialog' })
    expect(dialog).toHaveAttribute('open')
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
    expect(document.documentElement.style.overflow).toBe('hidden')
  })

  it('closes on the ✕, then unlocks scrolling and returns focus to the opener', async () => {
    const user = await openDialog()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.documentElement.style.overflow).toBe('')
    expect(screen.getByRole('button', { name: 'Open it' })).toHaveFocus()
  })

  it('closes on Escape (the dialog\'s cancel event)', async () => {
    await openDialog()
    const dialog = screen.getByRole('dialog')
    act(() => {
      dialog.dispatchEvent(new Event('cancel', { cancelable: true }))
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it("stays open under StrictMode's unmount/remount (its own close isn't the user's)", async () => {
    const user = userEvent.setup()
    render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    )
    await user.click(screen.getByRole('button', { name: 'Open it' }))
    expect(screen.getByRole('dialog', { name: 'Test dialog' })).toHaveAttribute('open')
  })

  it('closes on a backdrop click but not on a click inside the panel', async () => {
    const user = await openDialog()
    await user.click(screen.getByText('Body'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('dialog'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
