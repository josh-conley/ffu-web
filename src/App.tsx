import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Overview } from '@/pages/Overview'
import { Standings } from '@/pages/Standings'
import { Matchups } from '@/pages/Matchups'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="standings" element={<Standings />} />
          <Route path="matchups" element={<Matchups />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
