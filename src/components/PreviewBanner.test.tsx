import { render, screen } from '@testing-library/react'
import { PreviewBanner } from './PreviewBanner'

describe('PreviewBanner', () => {
  it('renders nothing outside a preview build', () => {
    const { container } = render(<PreviewBanner preview={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('names the branch and links to its pull request', () => {
    render(<PreviewBanner preview={{ branch: 'preview/playoff-odds', prUrl: 'https://github.com/o/r/pull/9' }} />)
    expect(screen.getByText('preview/playoff-odds')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /merge it on github/i })).toHaveAttribute('href', 'https://github.com/o/r/pull/9')
  })
})
