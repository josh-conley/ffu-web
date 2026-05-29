import { render, screen } from '@testing-library/react'
import App from './App'

// Smoke test: proves the test stack (jsdom + RTL + jest-dom + globals) is wired
// and the router shell renders the index route. Real coverage starts in Phase 1.
describe('App', () => {
  it('renders the Overview landing page at the index route', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: /fantasy football union/i }),
    ).toBeInTheDocument()
  })
})
