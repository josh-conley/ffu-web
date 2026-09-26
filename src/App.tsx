import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Overview } from '@/pages/Overview'
import { Standings } from '@/pages/Standings'
import { Matchups } from '@/pages/Matchups'
import { Records } from '@/pages/Records'
import { LinealChampion } from '@/pages/LinealChampion'
import { Members } from '@/pages/Members'
import { Milestones } from '@/pages/Milestones'
import { AroundTheUnion } from '@/pages/AroundTheUnion'
import { Cup } from '@/pages/Cup'
import { NotFound } from '@/components/NotFound'

/**
 * The heavier, less-visited pages are split into their own chunks so the home page doesn't download
 * them (/stats alone brings @dnd-kit). The home page, standings and matchups stay eager: they're
 * the common landings. Pages are named exports, so each loader maps its one export to `default`.
 */
const AllTimeStats = lazy(() => import('@/pages/AllTimeStats').then((m) => ({ default: m.AllTimeStats })))
const Drafts = lazy(() => import('@/pages/Drafts').then((m) => ({ default: m.Drafts })))
const RosterBuildStats = lazy(() =>
  import('@/pages/RosterBuildStats').then((m) => ({ default: m.RosterBuildStats })),
)
const DraftMarket = lazy(() => import('@/pages/DraftMarket').then((m) => ({ default: m.DraftMarket })))
const Players = lazy(() => import('@/pages/Players').then((m) => ({ default: m.Players })))
const CupDraw = lazy(() => import('@/pages/CupDraw').then((m) => ({ default: m.CupDraw })))

/** A lazy page's element, showing the same spinner the pages use while their data loads. */
function page(Page: ComponentType): ReactNode {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Page />
    </Suspense>
  )
}

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
          <Route path="stats" element={page(AllTimeStats)} />
          {/* Earlier paths for this page; redirect stale bookmarks to the current /stats. */}
          <Route path="leaderboard" element={<Navigate to="/stats" replace />} />
          <Route path="all-time" element={<Navigate to="/stats" replace />} />
          <Route path="drafts" element={page(Drafts)} />
          <Route path="builds" element={page(RosterBuildStats)} />
          <Route path="milestones" element={<Milestones />} />
          <Route path="adp-comparison" element={page(DraftMarket)} />
          <Route path="around-the-union" element={<AroundTheUnion />} />
          <Route path="players" element={page(Players)} />
          {/* Earlier path for this page; redirect stale bookmarks to the current /builds. */}
          <Route path="draft-analysis" element={<Navigate to="/builds" replace />} />
          <Route path="cup" element={<Cup />} />
          {/* Operator view for the live draw night. Unlisted: reachable by URL, not via the nav. */}
          <Route path="cup/draw" element={page(CupDraw)} />
          {/* Earlier path for this page; redirect stale bookmarks to the current /cup. */}
          <Route path="tournament" element={<Navigate to="/cup" replace />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
