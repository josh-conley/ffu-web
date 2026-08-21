import { useState } from 'react'
import { CUP_ACCENT, CUP_FIELD_SIZE, CUP_INAUGURAL_YEAR, CUP_NAME, CUP_YEAR } from '@/config'
import { useCup } from '@/hooks/useCup'
import { useUrlState } from '@/hooks/useUrlState'
import { Tabs, TabPanel, type TabDef } from '@/components/Tabs'
import { TournamentBoxScore } from '@/components/TournamentBoxScore'
import type { OpenMatchup } from '@/components/TournamentBracket'
import { CupBracketPanel } from '@/components/cup/CupBracketPanel'
import { CupFormatPanel } from '@/components/cup/CupFormatPanel'
import { CupFacts } from '@/components/cup/parts'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

// The FFU Cup. The bracket leads — that's what people come for — with the format, rules, draw and
// prizing a tab away. Before the draw the bracket is an outline of empty slots; once the field is
// published into public/data/{year}/tournament.json the same panel resolves the real thing. Pinned
// to CUP_YEAR (config/cup.ts), so the nav entry is deliberately NOT season-scoped.

const TABS: readonly TabDef[] = [
  { id: 'bracket', label: 'Bracket' },
  { id: 'format', label: 'Format & Rules' },
]

export function Cup() {
  const { tournament, outline, resolved, drawn, loading, error } = useCup(CUP_YEAR)
  const [view, setView] = useUrlState('view', 'bracket')
  const [open, setOpen] = useState<OpenMatchup | null>(null)

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  if (!tournament) return <ErrorMessage error={`No ${CUP_NAME} is scheduled for ${CUP_YEAR}.`} />

  const openMatchup = open ? open.round.matchups[open.matchupIndex] : undefined
  const weeks = outline.map((r) => r.week)
  const facts = [
    { value: String(CUP_FIELD_SIZE), label: 'Teams' },
    { value: '3', label: 'Leagues' },
    { value: String(outline.length), label: 'Rounds' },
    { value: weeks.length > 0 ? `${weeks[0]}–${weeks[weeks.length - 1]}` : '—', label: 'Weeks' },
  ]

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: CUP_ACCENT }}>
          {CUP_YEAR === CUP_INAUGURAL_YEAR ? 'Inaugural season' : `${CUP_YEAR} season`}
        </p>
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">{CUP_NAME}</h1>
        <p className="max-w-3xl text-sm text-muted">
          All thirty-six teams in the Union — Premier, Masters and National — drawn into one single-elimination
          bracket, played out inside the regular season. Your normal weekly score is your Cup score: win and you
          advance, lose and you&apos;re out.
        </p>
      </header>

      <CupFacts facts={facts} />

      <Tabs tabs={TABS} value={view} onChange={setView} label="Cup views" />

      {view === 'format' ? (
        <TabPanel id="format">
          <CupFormatPanel rounds={outline} year={CUP_YEAR} />
        </TabPanel>
      ) : (
        <TabPanel id="bracket">
          <CupBracketPanel drawn={drawn} resolved={resolved} outline={outline} year={CUP_YEAR} onOpen={setOpen} />
        </TabPanel>
      )}

      {open && openMatchup && (
        <TournamentBoxScore
          year={CUP_YEAR}
          week={open.round.week}
          label={open.round.label}
          matchup={openMatchup}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}
