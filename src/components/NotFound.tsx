import { Link } from 'react-router-dom'

// Catch-all for unknown URLs (e.g. a stale deep link). Without this an unmatched route renders
// nothing under the header — a blank page. Recoverable: links back to the Overview.
export function NotFound() {
  return (
    <div className="py-12 text-center">
      <p className="text-sm font-bold uppercase tracking-wider text-accent">404</p>
      <h1 className="mt-2 text-2xl font-extrabold uppercase tracking-tight">Page not found</h1>
      <p className="mt-2 text-muted">That page doesn’t exist (or moved).</p>
      <Link
        to="/"
        className="angular-sm mt-6 inline-block bg-accent px-4 py-2 text-sm font-bold uppercase tracking-wide text-accent-fg hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text"
      >
        Back to Overview
      </Link>
    </div>
  )
}
