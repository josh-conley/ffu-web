import { useMemo, useState } from 'react'
import { FaTrophy } from 'react-icons/fa'
import { nameForYear } from '@/config'
import { useSeason, useTournament } from '@/hooks/useLeagueData'
import { resolveTournament, type SeasonsByTier } from '@/selectors/tournament'
import { TournamentBracket, type OpenMatchup } from '@/components/TournamentBracket'
import { TournamentBoxScore } from '@/components/TournamentBoxScore'
import { TeamLogo } from '@/components/TeamLogo'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

// Hidden page (not in nav): a mid-season, 36-team, cross-tier knockout tournament. Currently wired to
// the 2025 season as a working backfill; the year is the one knob to change when it moves forward.
const YEAR = '2025'

// Tournament theme color — one-off accent for this event (not a tier color, so it stays local here
// rather than in leagues.ts).
const TOURNAMENT_ACCENT = '#3686ff'

function ChampionBanner({ ffuId, year }: { ffuId: string; year: string }) {
  return (
    <div className="flex items-center gap-3 border bg-surface-2 px-4 py-3" style={{ borderColor: TOURNAMENT_ACCENT }}>
      <FaTrophy size={22} aria-hidden style={{ color: TOURNAMENT_ACCENT }} />
      <TeamLogo ffuId={ffuId} size={32} />
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted">Champion</div>
        <div className="text-lg font-extrabold uppercase tracking-tight">{nameForYear(ffuId, year) ?? ffuId}</div>
      </div>
    </div>
  )
}

/** Loads the tournament + all three tiers for the year and resolves the bracket. */
function useResolvedTournament(year: string) {
  const tournament = useTournament(year)
  const premier = useSeason('PREMIER', year)
  const masters = useSeason('MASTERS', year)
  const national = useSeason('NATIONAL', year)

  const loading = tournament.loading || premier.loading || masters.loading || national.loading
  const error = tournament.error ?? premier.error ?? masters.error ?? national.error

  const resolved = useMemo(() => {
    if (!tournament.data) return null
    const seasonsByTier: SeasonsByTier = {}
    if (premier.data) seasonsByTier.PREMIER = premier.data
    if (masters.data) seasonsByTier.MASTERS = masters.data
    if (national.data) seasonsByTier.NATIONAL = national.data
    return resolveTournament(tournament.data, seasonsByTier)
  }, [tournament.data, premier.data, masters.data, national.data])

  return { resolved, loading, error }
}

export function Tournament() {
  const { resolved, loading, error } = useResolvedTournament(YEAR)
  const [open, setOpen] = useState<OpenMatchup | null>(null)

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  if (!resolved) return <ErrorMessage error="No tournament is defined for this season." />

  const openMatchup = open ? open.round.matchups[open.matchupIndex] : undefined

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">{resolved.name}</h1>
        <p className="text-sm text-muted">{YEAR} · 36 teams · cross-tier knockout</p>
      </header>
      {resolved.champion && <ChampionBanner ffuId={resolved.champion} year={YEAR} />}
      <TournamentBracket tournament={resolved} year={YEAR} onOpen={setOpen} />
      {open && openMatchup && (
        <TournamentBoxScore
          year={YEAR}
          week={open.round.week}
          label={open.round.label}
          matchup={openMatchup}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}
