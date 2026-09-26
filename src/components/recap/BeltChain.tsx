import { Fragment } from 'react'
import { FaEllipsis } from 'react-icons/fa6'
import { getMember } from '@/config'
import { plural } from '@/lib/plural'
import type { LinealReign } from '@/selectors'
import { TeamLink } from '../TeamLink'

/**
 * The belt's chain of custody: the last few holders, oldest first, each linked to the next by the
 * game that took it off them.
 *
 * Laid out left-to-right because that is what the lineage IS — a handover, not a ranking. The
 * connector carries the score, since "who took it" only means something with "by how much" next
 * to it. Abbreviations rather than team names: five names would not fit the newsletter's column,
 * and the logo already says who it is.
 */

const abbr = (memberId: string) => getMember(memberId)?.abbreviation ?? memberId

function Holder({ reign }: { reign: LinealReign }) {
  return (
    <li className={`flex shrink-0 flex-col items-center gap-1 px-2 py-1 ${reign.current ? 'bg-accent/10' : ''}`}>
      <TeamLink ffuId={reign.championId} logoSize={36} label={getMember(reign.championId)?.name} className="flex-col gap-1">
        <span className="font-mono text-[11px] font-bold uppercase leading-none">{abbr(reign.championId)}</span>
      </TeamLink>
      <span className="font-mono text-[10px] leading-none tabular-nums text-muted">{plural(reign.weeksHeld, 'wk')}</span>
    </li>
  )
}

/**
 * How the belt moved into the reign on its right: when, and the score that did it.
 *
 * A list item of its own rather than decoration, so the handover — the actual news of a lineage —
 * is read out too, not only seen.
 */
function Handover({ reign }: { reign: LinealReign }) {
  const { wonAt, wonBout } = reign
  return (
    <li className="flex shrink-0 flex-col items-center justify-center gap-0.5 px-1 text-center">
      <span className="font-mono text-[10px] leading-none text-muted">
        {wonAt.year} W{wonAt.week}
      </span>
      <span className="h-px w-8 bg-border" />
      <span className="font-mono text-[10px] font-bold leading-none tabular-nums">
        {wonBout.score.toFixed(1)}–{wonBout.opponentScore.toFixed(1)}
      </span>
    </li>
  )
}

export function BeltChain({ chain, truncated }: { chain: LinealReign[]; truncated: boolean }) {
  if (chain.length === 0) return null
  return (
    <ol aria-label="Belt chain of custody" className="flex items-stretch gap-1 overflow-x-auto bg-surface px-3 py-2">
      {truncated && (
        <li className="flex shrink-0 items-center px-1 text-muted" title="Earlier holders">
          <FaEllipsis aria-label="Earlier holders" />
        </li>
      )}
      {chain.map((reign, i) => (
        <Fragment key={reign.order}>
          {(i > 0 || truncated) && <Handover reign={reign} />}
          <Holder reign={reign} />
        </Fragment>
      ))}
    </ol>
  )
}
