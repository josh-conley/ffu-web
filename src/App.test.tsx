import { render, screen } from '@testing-library/react'
import App from './App'

// Smoke test: proves the test stack (jsdom + RTL + jest-dom + globals) is wired and the app
// shell (header + nav + router) mounts. Page content is data-driven and covered per-page.
describe('App', () => {
  it('mounts the app shell with header + nav', () => {
    render(<App />)
    expect(screen.getByRole('link', { name: /fantasy football union/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Standings' })).toBeInTheDocument()
    // Grouped links live behind a dropdown; the shell renders their trigger.
    expect(screen.getByRole('button', { name: /Stats/ })).toBeInTheDocument()
  })
})
