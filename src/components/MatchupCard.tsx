import type { ReactNode } from 'react'
import { FaCrown } from 'react-icons/fa6'
import type { Game, ScheduledGame } from '@/data'
import { nameForYear } from '@/config'
import { winnerOf } from '@/selectors'
import { useSeriesPreview } from '@/hooks/useSeriesPreview'
import { TeamLogo } from './TeamLogo'
import { lineupsLabel, seriesLineText } from './seriesText'

/** `final`: the result stands — winner bar and bold, loser muted. `live`: still being played, so
 *  neither team is dressed as having won or lost; only the leading score is bold. */
export type MatchupStatus = 'final' | 'live'

/** Logo, name, belt marker and subtitle — the left side of every row, scored or not. */
function TeamLabel({ memberId, year, subtitle, hasBelt }: { memberId: string; year: string; subtitle?: string; hasBelt: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <TeamLogo ffuId={memberId} size={24} />
      <span className="truncate">{nameForYear(memberId, year) ?? memberId}</span>
      {hasBelt && (
        <span title="Lineal champion: the title is on the line" className="shrink-0 text-accent">
          <FaCrown aria-label="Lineal champion, title on the line" className="text-[11px]" />
        </span>
      )}
      {subtitle && <span className="shrink-0 font-mono text-[11px] font-normal text-muted">{subtitle}</span>}
    </span>
  )
}

type RowTone = 'won' | 'lost' | 'even'

const ROW_TONE: Record<RowTone, string> = {
  won: 'border-accent font-semibold',
  lost: 'border-transparent text-muted',
  even: 'border-transparent',
}

function ParticipantRow({
  memberId,
  score,
  year,
  tone,
  leading,
  subtitle,
  projected,
  hasBelt,
}: {
  memberId: string
  score: number
  year: string
  tone: RowTone
  /** A live game's leader: the score alone is bold. */
  leading: boolean
  subtitle?: string
  projected?: number
  hasBelt: boolean
}) {
  return (
    <div className={`flex items-center justify-between gap-2 border-l-2 pl-2 ${ROW_TONE[tone]}`}>
      <TeamLabel memberId={memberId} year={year} subtitle={subtitle} hasBelt={hasBelt} />
      {/* Projection stacked under the score, not beside it, so it never takes width from the name. */}
      <span className="flex shrink-0 flex-col items-end leading-tight">
        <span className={`font-mono tabular-nums ${leading ? 'font-semibold' : ''}`}>{score.toFixed(2)}</span>
        {projected !== undefined && <span className="font-mono text-[11px] font-normal text-muted tabular-nums" title="Projected final score">proj {projected.toFixed(1)}</span>}
      </span>
    </div>
  )
}

/** The all-time series under a game still to be decided; nothing at all for a first meeting. */
function SeriesLine({ memberIds }: { memberIds: readonly string[] }) {
  const preview = useSeriesPreview(memberIds)
  if (!preview) return null
  return <p className="mt-1.5 pl-2.5 text-[11px] leading-snug text-muted">{seriesLineText(preview)}</p>
}

/** A plain box, or a whole-card button when it opens the game's lineups. */
function CardShell({ base, label, onOpen, children }: { base: string; label: string; onOpen?: () => void; children: ReactNode }) {
  if (!onOpen) return <div className={base}>{children}</div>
  return (
    <button type="button" onClick={onOpen} title="View lineups" aria-label={label} className={`${base} cursor-pointer transition-colors hover:border-accent hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}>
      {children}
    </button>
  )
}

function rowTone(status: MatchupStatus, winner: string | null, memberId: string): RowTone {
  if (status === 'live') return 'even'
  return memberId === winner ? 'won' : 'lost'
}

/** `subtitle`: small tag beside each team — its running record (regular season) or seed (playoffs).
 *  `projected`: a live game's projected final score per team, shown beside the actual one.
 *  `beltHolderId`: who carries the lineal belt into this week; marked if they're in this game. */
export function MatchupCard({
  game,
  year,
  status = 'final',
  onOpen,
  subtitle,
  projected,
  beltHolderId,
}: {
  game: Game
  year: string
  status?: MatchupStatus
  onOpen?: () => void
  subtitle?: (memberId: string) => string | undefined
  projected?: (memberId: string) => number | undefined
  beltHolderId?: string
}) {
  const winner = winnerOf(game)
  const memberIds = game.participants.map((p) => p.memberId)
  const titleOnTheLine = beltHolderId !== undefined && memberIds.includes(beltHolderId)
  return (
    <CardShell base="block w-full border border-border bg-surface p-3 text-left shadow-sm" label={lineupsLabel(memberIds, year, titleOnTheLine)} onOpen={onOpen}>
      {game.round && <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">{game.round}</div>}
      <div className="space-y-1">
        {game.participants.map((p) => (
          <ParticipantRow
            key={p.memberId}
            memberId={p.memberId}
            score={p.score}
            year={year}
            tone={rowTone(status, winner, p.memberId)}
            leading={status === 'live' && p.memberId === winner}
            subtitle={subtitle?.(p.memberId)}
            projected={projected?.(p.memberId)}
            hasBelt={p.memberId === beltHolderId}
          />
        ))}
      </div>
      {status === 'live' && <SeriesLine memberIds={memberIds} />}
    </CardShell>
  )
}

/**
 * A matchup that hasn't been played: the two teams and their records, no scores. Dashed and muted so
 * it reads as a fixture rather than a nil-nil result — the whole point is that there is nothing to
 * report yet. Clickable wherever lineups can be fetched live (`onOpen`), which is how you see who a
 * manager is starting this week before the games count.
 */
export function FixtureCard({
  fixture,
  year,
  onOpen,
  subtitle,
  beltHolderId,
}: {
  fixture: ScheduledGame
  year: string
  onOpen?: () => void
  subtitle?: (memberId: string) => string | undefined
  beltHolderId?: string
}) {
  const titleOnTheLine = beltHolderId !== undefined && fixture.memberIds.includes(beltHolderId)
  return (
    <CardShell base="block w-full border border-dashed border-border bg-surface/60 p-3 text-left" label={lineupsLabel(fixture.memberIds, year, titleOnTheLine)} onOpen={onOpen}>
      <div className="space-y-1">
        {fixture.memberIds.map((memberId) => (
          <div key={memberId} className="flex items-center justify-between gap-2 border-l-2 border-transparent pl-2 text-muted">
            <TeamLabel memberId={memberId} year={year} subtitle={subtitle?.(memberId)} hasBelt={memberId === beltHolderId} />
            <span className="font-mono text-xs tabular-nums" aria-label="not yet played">—</span>
          </div>
        ))}
      </div>
      <SeriesLine memberIds={fixture.memberIds} />
    </CardShell>
  )
}
