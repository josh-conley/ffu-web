import { useMemo } from 'react'
import { FaArrowDown, FaArrowUp } from 'react-icons/fa6'
import { tierMoves, type MemberSeason, type TierMove, type TierMoveKind } from '@/selectors'
import { LeagueBadge } from '../LeagueBadge'
import { TierTimeline } from '../TierTimeline'
import { MemberSection } from './MemberSection'

const KIND: Record<TierMoveKind, { label: string; up?: boolean; tone: string }> = {
  promoted: { label: 'Promoted', up: true, tone: 'text-positive' },
  relegated: { label: 'Relegated', up: false, tone: 'text-negative' },
  'moved-up': { label: 'Moved up · no flag', up: true, tone: 'text-muted' },
  'moved-down': { label: 'Moved down · no flag', up: false, tone: 'text-muted' },
  returned: { label: 'Returned', tone: 'text-muted' },
}

function MoveRow({ move }: { move: TierMove }) {
  const { label, up, tone } = KIND[move.kind]
  const Arrow = up === undefined ? null : up ? FaArrowUp : FaArrowDown
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
      <span className="w-10 font-mono tabular-nums">{move.year}</span>
      <span className={`inline-flex w-44 items-center gap-1.5 font-semibold ${tone}`}>
        {Arrow && <Arrow aria-hidden />}
        {label}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <LeagueBadge tier={move.from} />
        <span aria-hidden>→</span>
        <span className="sr-only">to</span>
        {move.to ? (
          <>
            <LeagueBadge tier={move.to.tier} />
            {Number(move.to.year) - Number(move.year) > 1 && <span className="text-muted">in {move.to.year}</span>}
          </>
        ) : (
          <span className="text-muted">next season</span>
        )}
      </span>
    </li>
  )
}

/** Up/down history: the tier chart plus every promotion, relegation and unflagged move. */
export function TierMovesSection({ history }: { history: MemberSeason[] }) {
  const moves = useMemo(() => tierMoves(history), [history])
  return (
    <MemberSection
      title="Up / Down History"
      note="Promotions and relegations are the flags recorded with each season, from 2021 on. Tier changes without one — the 2018–2020 seasons and the 2022 expansion placements into Masters — show as unflagged moves."
    >
      <div className="border border-border bg-surface p-3 shadow-sm">
        <TierTimeline seasons={history} />
      </div>
      {moves.length > 0 ? (
        <ul className="divide-y divide-border border border-border bg-surface shadow-sm">
          {moves.map((m) => <MoveRow key={m.year} move={m} />)}
        </ul>
      ) : (
        <p className="text-sm text-muted">Never changed tiers.</p>
      )}
    </MemberSection>
  )
}
