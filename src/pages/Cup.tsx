import { useState } from 'react'
import { FaTrophy } from 'react-icons/fa6'
import {
  CUP_ACCENT,
  CUP_FIELD_SIZE,
  CUP_INAUGURAL_YEAR,
  CUP_NAME,
  CUP_YEAR,
  nameForYear,
} from '@/config'
import { useCup } from '@/hooks/useCup'
import { TournamentBracket, type OpenMatchup } from '@/components/TournamentBracket'
import { TournamentBoxScore } from '@/components/TournamentBoxScore'
import { CupBracketOutline } from '@/components/cup/CupBracketOutline'
import { CupDraw } from '@/components/cup/CupDraw'
import { CupRounds } from '@/components/cup/CupRounds'
import { CupSchedule } from '@/components/cup/CupSchedule'
import { CupSpoils } from '@/components/cup/CupSpoils'
import { CupFacts, CupSection } from '@/components/cup/parts'
import { TeamLogo } from '@/components/TeamLogo'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

// The FFU Cup: part explainer, part bracket. Before the draw it reads as a preview of the format —
// schedule, rules, how the draw works, what it pays — and closes on an empty bracket. Once the
// commissioner publishes the field into public/data/{year}/tournament.json, the same page resolves
// and shows the real bracket in that final slot. Pinned to CUP_YEAR (config), so the nav entry is
// deliberately NOT season-scoped.

function ChampionBanner({ ffuId, year }: { ffuId: string; year: string }) {
  return (
    <div className="flex items-center gap-3 border bg-surface-2 px-4 py-3" style={{ borderColor: CUP_ACCENT }}>
      <FaTrophy size={22} aria-hidden style={{ color: CUP_ACCENT }} />
      <TeamLogo ffuId={ffuId} size={32} />
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted">Champion</div>
        <div className="text-lg font-extrabold uppercase tracking-tight">{nameForYear(ffuId, year) ?? ffuId}</div>
      </div>
    </div>
  )
}

export function Cup() {
  const { tournament, outline, resolved, drawn, loading, error } = useCup(CUP_YEAR)
  const [open, setOpen] = useState<OpenMatchup | null>(null)

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  if (!tournament) return <ErrorMessage error={`No ${CUP_NAME} is scheduled for ${CUP_YEAR}.`} />

  const openMatchup = open ? open.round.matchups[open.matchupIndex] : undefined
  const facts = [
    { value: String(CUP_FIELD_SIZE), label: 'Teams' },
    { value: '3', label: 'Leagues' },
    { value: String(outline.length), label: 'Rounds' },
    { value: '1', label: 'Cup' },
  ]

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: CUP_ACCENT }}>
          {CUP_YEAR === CUP_INAUGURAL_YEAR ? 'Inaugural season' : `${CUP_YEAR} season`}
        </p>
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">{CUP_NAME}</h1>
        <p className="max-w-3xl text-sm text-muted">
          Every team in the Union — all thirty-six, across Premier, Masters and National — drawn into one
          single-elimination bracket. Nothing changes about your week: you set the same lineup for the same
          league game, and that score is your Cup score. Win and you advance. Lose and you are out.
        </p>
      </header>

      <CupFacts facts={facts} />

      <CupSection
        title="Schedule of events"
        lede="Cup timing moves each season with NFL bye weeks and the FFU calendar. The tournament weeks are announced alongside the finalization of Draft Day."
      >
        <CupSchedule rounds={outline} />
      </CupSection>

      <CupSection title="Round by round">
        <CupRounds rounds={outline} />
      </CupSection>

      <CupSection
        title="The draw"
        lede="The first round is drawn, not seeded — Premier draws its opposition out of the other two leagues, and seeding follows from the order teams come out."
      >
        <CupDraw />
      </CupSection>

      <CupSection title="Prizing">
        <CupSpoils rounds={outline} year={CUP_YEAR} />
      </CupSection>

      <CupSection
        title="The bracket"
        lede={drawn ? undefined : 'The draw has not been held. Slots fill in once the field is drawn.'}
      >
        {drawn && resolved ? (
          <>
            {resolved.champion && <ChampionBanner ffuId={resolved.champion} year={CUP_YEAR} />}
            <TournamentBracket tournament={resolved} year={CUP_YEAR} onOpen={setOpen} />
          </>
        ) : (
          <CupBracketOutline rounds={outline} />
        )}
      </CupSection>

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
