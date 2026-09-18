import { createRef } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CopyImageButton } from './CopyImageButton'
import { copyElementAsImage } from '@/lib/panelImage'

// The renderer itself needs a canvas, which jsdom doesn't have — what matters here is that the
// button hands it the right element and reports back whatever it answers.
vi.mock('@/lib/panelImage', () => ({ copyElementAsImage: vi.fn() }))
const copyMock = vi.mocked(copyElementAsImage)

// No shared reset hook: with one present, Vitest reports the rejection in the failure case as an
// unhandled error even though the component catches it. Every test sets its own implementation,
// and the one assertion on call arguments passes on a match rather than on the call count.

function renderButton() {
  const ref = createRef<HTMLDivElement>()
  render(
    <>
      <div ref={ref}>panel</div>
      <CopyImageButton targetRef={ref} filename="around-the-union.png" />
    </>,
  )
  return ref
}

it('copies the target element and says so', async () => {
  copyMock.mockResolvedValue('copied')
  const ref = renderButton()
  await userEvent.click(screen.getByRole('button'))
  await waitFor(() => expect(screen.getByText('Copied')).toBeInTheDocument())
  expect(copyMock).toHaveBeenCalledWith(ref.current, 'around-the-union.png')
})

it('reports the download fallback rather than claiming a copy', async () => {
  copyMock.mockResolvedValue('downloaded')
  renderButton()
  await userEvent.click(screen.getByRole('button'))
  // A browser that won't take an image on the clipboard saves a PNG instead — silently calling
  // that "Copied" would send the author to an empty clipboard.
  await waitFor(() => expect(screen.getByText('Downloaded')).toBeInTheDocument())
})

it('surfaces a failure instead of looking like it worked', async () => {
  // Rejected on CALL. `mockRejectedValue` builds the rejection at setup time (unhandled before the
  // click consumes it), and an `async` implementation that throws is reported by Vitest even when
  // the component catches it.
  copyMock.mockImplementation(() => Promise.reject(new Error('no canvas')))
  renderButton()
  await userEvent.click(screen.getByRole('button'))
  await waitFor(() => expect(screen.getByText("Couldn't copy")).toBeInTheDocument())
})

it('offers itself again after reporting', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  copyMock.mockResolvedValue('copied')
  renderButton()
  await userEvent.click(screen.getByRole('button'))
  await waitFor(() => expect(screen.getByText('Copied')).toBeInTheDocument())
  vi.advanceTimersByTime(3000)
  await waitFor(() => expect(screen.getByText('Copy image')).toBeInTheDocument())
  vi.useRealTimers()
})
