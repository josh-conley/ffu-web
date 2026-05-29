import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Overview } from '@/pages/Overview'
import { Standings } from '@/pages/Standings'
import { Matchups } from '@/pages/Matchups'
import { Records } from '@/pages/Records'
import { Members } from '@/pages/Members'
import { AllTimeStats } from '@/pages/AllTimeStats'
import { Drafts } from '@/pages/Drafts'
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
          <Route path="all-time" element={<AllTimeStats />} />
          <Route path="drafts" element={<Drafts />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
