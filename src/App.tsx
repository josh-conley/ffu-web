import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Overview } from '@/pages/Overview'
import { Standings } from '@/pages/Standings'
import { Matchups } from '@/pages/Matchups'
import { Records } from '@/pages/Records'
import { LinealChampion } from '@/pages/LinealChampion'
import { Members } from '@/pages/Members'
import { AllTimeStats } from '@/pages/AllTimeStats'
import { Drafts } from '@/pages/Drafts'
import { RosterBuildStats } from '@/pages/RosterBuildStats'
import { Milestones } from '@/pages/Milestones'
import { DraftMarket } from '@/pages/DraftMarket'
import { Cup } from '@/pages/Cup'
import { CupDraw } from '@/pages/CupDraw'
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
          <Route path="lineal" element={<LinealChampion />} />
          <Route path="members" element={<Members />} />
          <Route path="stats" element={<AllTimeStats />} />
          {/* Earlier paths for this page; redirect stale bookmarks to the current /stats. */}
          <Route path="leaderboard" element={<Navigate to="/stats" replace />} />
          <Route path="all-time" element={<Navigate to="/stats" replace />} />
          <Route path="drafts" element={<Drafts />} />
          <Route path="builds" element={<RosterBuildStats />} />
          <Route path="milestones" element={<Milestones />} />
          <Route path="adp-comparison" element={<DraftMarket />} />
          {/* Earlier path for this page; redirect stale bookmarks to the current /builds. */}
          <Route path="draft-analysis" element={<Navigate to="/builds" replace />} />
          <Route path="cup" element={<Cup />} />
          {/* Operator view for the live draw night. Unlisted: reachable by URL, not via the nav. */}
          <Route path="cup/draw" element={<CupDraw />} />
          {/* Earlier path for this page; redirect stale bookmarks to the current /cup. */}
          <Route path="tournament" element={<Navigate to="/cup" replace />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
