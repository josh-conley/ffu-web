import { Outlet } from 'react-router-dom'
import { Header } from './Header'

/** App shell: persistent header wrapping routed pages. */
export function Layout() {
  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <Header />
      <main className="mx-auto max-w-5xl w-full px-4 py-8 flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border py-4 text-center text-sm text-muted">
        Fantasy Football Union · Est. 2018
      </footer>
    </div>
  )
}
