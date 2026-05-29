import { Outlet } from 'react-router-dom'

/** App shell: persistent chrome (header/theme/nav come later) wrapping routed pages. */
export function Layout() {
  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
