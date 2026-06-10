import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { TeamProfileProvider } from './TeamProfileProvider'

/** App shell: persistent header wrapping routed pages. */
export function Layout() {
  return (
    <TeamProfileProvider>
      <div className="min-h-screen bg-bg text-text">
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-8">
          <Outlet />
        </main>
      </div>
    </TeamProfileProvider>
  )
}
