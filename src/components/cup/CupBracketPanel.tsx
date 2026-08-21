import { FaTrophy } from 'react-icons/fa6'
import { CUP_ACCENT, nameForYear } from '@/config'
import type { ResolvedTournament, RoundOutline } from '@/selectors'
import { TournamentBracket, type OpenMatchup } from '../TournamentBracket'
import { TeamLogo } from '../TeamLogo'
import { CupBracketOutline } from './CupBracketOutline'

// The Cup's default view. Before the draw it is the bracket's shape with empty slots; afterwards
// the same frame holds the resolved bracket, so the page doesn't change character on draw day.

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

export function CupBracketPanel({ drawn, resolved, outline, year, onOpen }: {
  drawn: boolean
  resolved: ResolvedTournament | undefined
  outline: RoundOutline[]
  year: string
  onOpen: (m: OpenMatchup) => void
}) {
  if (drawn && resolved) {
    return (
      <div className="space-y-4">
        {resolved.champion && <ChampionBanner ffuId={resolved.champion} year={year} />}
        <TournamentBracket tournament={resolved} year={year} onOpen={onOpen} />
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        The draw has not been held. Slots fill in once the field is drawn — see Format &amp; Rules for how
        that works.
      </p>
      <CupBracketOutline rounds={outline} />
    </div>
  )
}
