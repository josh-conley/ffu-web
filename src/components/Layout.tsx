import { Outlet } from 'react-router-dom'
import { Header } from './Header'

/** App shell: persistent header wrapping routed pages. */
export function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
