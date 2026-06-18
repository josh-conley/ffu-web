import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Overview } from '@/pages/Overview'
import { Standings } from '@/pages/Standings'
import { Matchups } from '@/pages/Matchups'
import { Records } from '@/pages/Records'
import { Members } from '@/pages/Members'
import { AllTimeStats } from '@/pages/AllTimeStats'
import { Drafts } from '@/pages/Drafts'
import { Tournament } from '@/pages/Tournament'
import { NotFound } from '@/components/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="standings" element={<Standings />} />
          <Route path="matchups" element={<Matchups />} />
          <Route path="records" element={<Records />} />
          <Route path="members" element={<Members />} />
          <Route path="stats" element={<AllTimeStats />} />
          {/* Earlier paths for this page; redirect stale bookmarks to the current /stats. */}
          <Route path="leaderboard" element={<Navigate to="/stats" replace />} />
          <Route path="all-time" element={<Navigate to="/stats" replace />} />
          <Route path="drafts" element={<Drafts />} />
          {/* Hidden (intentionally absent from nav.ts): reachable only by direct URL while the
              cross-tier tournament is being built out. */}
          <Route path="tournament" element={<Tournament />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
