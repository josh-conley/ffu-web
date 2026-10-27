import { useMemo, useState, type ComponentProps } from 'react'
import { CUP_ACCENT, CUP_FIELD_SIZE, CUP_INAUGURAL_YEAR, CUP_NAME, CUP_PICKEM_API, CUP_YEAR } from '@/config'
import type { Tournament } from '@/data'
import { useCup } from '@/hooks/useCup'
import { useFormGoingInto } from '@/hooks/useFormGoingInto'
import { useLiveCupBracket } from '@/hooks/useLiveCupBracket'
import { useUrlState } from '@/hooks/useUrlState'
import { Tabs, TabPanel, type TabDef } from '@/components/Tabs'
import type { OpenMatchup } from '@/components/TournamentBracket'
import { CupBracketPanel } from '@/components/cup/CupBracketPanel'
import { CupMatchupModal } from '@/components/cup/CupMatchupModal'
import { CupFormatPanel } from '@/components/cup/CupFormatPanel'
import { CupFacts } from '@/components/cup/parts'
import { PickemPanel } from '@/components/cup/pickem/PickemPanel'
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
// The pick'em tab exists once there is a bracket to pick and the season has a pick'em lock time
// (tournament.json `pickemLocksAt`) — that field is the switch that exposes it.
const TABS_WITH_PICKEM: readonly TabDef[] = [...TABS, { id: 'pickem', label: "Pick'em" }]

/** The bracket or the rules — the two tabs every season has. */
function CupInfoTab({ view, outline, ...bracket }: Omit<ComponentProps<typeof CupBracketPanel>, 'year'> & { view: string }) {
  return view === 'format' ? <CupFormatPanel rounds={outline} year={CUP_YEAR} /> : <CupBracketPanel outline={outline} year={CUP_YEAR} {...bracket} />
}

const hasPickem = (t: Tournament, drawn: boolean) => CUP_PICKEM_API !== '' && drawn && t.pickemLocksAt !== undefined

export function Cup() {
  const { tournament, outline, resolved, drawn, tierSeasons, loading, error } = useCup(CUP_YEAR)
  // The round being played shows its live scores; the pick'em still scores from the season files.
  const bracket = useLiveCupBracket(tournament, resolved, tierSeasons)
  const roundWeeks = useMemo(() => outline.map((r) => r.week), [outline])
  const formOf = useFormGoingInto(tierSeasons, roundWeeks)
  const [view, setView] = useUrlState('view', 'bracket')
  const [open, setOpen] = useState<OpenMatchup | null>(null)

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  if (!tournament) return <ErrorMessage error={`No ${CUP_NAME} is scheduled for ${CUP_YEAR}.`} />

  const tabs = hasPickem(tournament, drawn) ? TABS_WITH_PICKEM : TABS
  // A stale link to a tab that isn't there (e.g. ?view=pickem before it opens) shows the bracket.
  const shown = tabs.some((t) => t.id === view) ? view : 'bracket'
  const openMatchup = open ? open.round.matchups[open.matchupIndex] : undefined
  const facts = [
    { value: String(CUP_FIELD_SIZE), label: 'Teams' },
    { value: '3', label: 'Leagues' },
    { value: String(outline.length), label: 'Rounds' },
    { value: roundWeeks.length > 0 ? `${roundWeeks[0]}–${roundWeeks[roundWeeks.length - 1]}` : '—', label: 'Weeks' },
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

      <Tabs tabs={tabs} value={shown} onChange={setView} label="Cup views" />

      <TabPanel id={shown}>
        {shown === 'pickem' ? (
          <PickemPanel tournament={tournament} played={resolved} seasons={tierSeasons} year={CUP_YEAR} />
        ) : (
          <CupInfoTab view={shown} drawn={drawn} resolved={bracket} outline={outline} onOpen={setOpen} formOf={formOf} />
        )}
      </TabPanel>

      {open && openMatchup && (
        <CupMatchupModal
          game={{ year: CUP_YEAR, week: open.round.week, label: open.round.label, a: openMatchup.a, b: openMatchup.b, live: open.round.live }}
          formOf={formOf}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}
