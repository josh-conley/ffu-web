import { Outlet } from 'react-router-dom'
import { PREVIEW_BUILD } from '@/config'
import { Header } from './Header'
import { PreviewBanner } from './PreviewBanner'
import { TeamProfileProvider } from './TeamProfileProvider'

/** App shell: persistent header wrapping routed pages. */
export function Layout() {
  return (
    <TeamProfileProvider>
      <div className="min-h-screen bg-bg text-text">
        <PreviewBanner preview={PREVIEW_BUILD} />
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-8">
          <Outlet />
        </main>
      </div>
    </TeamProfileProvider>
  )
}
