import { FaChessKing } from 'react-icons/fa6'
import { Link } from 'react-router-dom'
import { nameForYear } from '@/config'
import { plural } from '@/lib/plural'
import type { BeltWatch } from '@/selectors'
import { TeamNameButton } from '../TeamLink'
import { TeamLogo } from '../TeamLogo'
import { BeltChain } from './BeltChain'
import { RecapPanel } from './RecapPanel'

/**
 * The lineal belt, as of the week — the one recap item no other league can print, because it is an
 * unbroken chain back to the first FFU title rather than a standings position.
 *
 * The headline is whether it MOVED. A defense is a fact; a new holder is the story, so the block
 * says who took it and from whom.
 */

const name = (memberId: string, year: string) => nameForYear(memberId, year) ?? memberId

function Headline({ watch, year }: { watch: BeltWatch; year: string }) {
  const changed = watch.tookItFrom !== undefined
  return (
    <div className="flex min-w-0 items-center gap-3 bg-accent px-3 py-2.5 text-accent-fg">
      <FaChessKing className="shrink-0 text-2xl" aria-hidden />
      <TeamLogo ffuId={watch.holderId} size={40} clickable={false} />
      <div className="min-w-0 flex-1">
        {/* Only the name line opens the profile: the line under it can name the old holder. */}
        <div className="relative text-lg font-extrabold uppercase leading-tight tracking-tight sm:text-xl">
          <TeamNameButton ffuId={watch.holderId}>
            <span className="truncate">{name(watch.holderId, year)}</span>
          </TeamNameButton>
        </div>
        <div className="font-mono text-xs font-bold leading-tight opacity-90">
          {changed ? `Took it from ${name(watch.tookItFrom!, year)}` : `${plural(watch.defenses, 'defense')} · ${plural(watch.weeksHeld, 'week')}`}
        </div>
      </div>
    </div>
  )
}

/** The week's title game, when the holder played one — the belt is on the line every week they do. */
function Bout({ watch, year }: { watch: BeltWatch; year: string }) {
  const bout = watch.bout
  if (bout === undefined) {
    return <div className="bg-surface px-3 py-2 text-sm text-muted">The belt wasn't on the line this week.</div>
  }
  const held = bout.outcome !== 'lost'
  return (
    <div className="flex min-w-0 items-center gap-2 bg-surface px-3 py-2 text-sm">
      <span className="shrink-0 text-[11px] font-bold uppercase tracking-widest text-muted">
        {bout.outcome === 'lost' ? 'Belt changed hands' : bout.outcome === 'drawn' ? 'Drawn — belt stays' : 'Defended'}
      </span>
      <span className="ml-auto flex min-w-0 items-center gap-2">
        <span className={`truncate ${held ? 'font-bold' : 'text-muted'}`}>{name(bout.championId, year)}</span>
        <span className="shrink-0 font-mono font-bold tabular-nums">{bout.championScore.toFixed(2)}</span>
        <span className="shrink-0 text-muted">v</span>
        <span className={`truncate ${held ? 'text-muted' : 'font-bold'}`}>{name(bout.challengerId, year)}</span>
        <span className="shrink-0 font-mono font-bold tabular-nums">{bout.challengerScore.toFixed(2)}</span>
      </span>
    </div>
  )
}

export function WeekBelt({
  watch,
  year,
  week,
  compact,
  copyFilename,
}: {
  watch: BeltWatch | null
  year: string
  week: number | undefined
  compact: boolean
  copyFilename?: string
}) {
  if (watch === null) return null
  return (
    <RecapPanel
      title="Lineal Champ — Belt Watch"
      meta={week ? `${year} · Week ${week}` : year}
      compact={compact}
      copyFilename={copyFilename}
    >
      <div className="flex flex-col gap-px bg-border">
        <Headline watch={watch} year={year} />
        <Bout watch={watch} year={year} />
        <BeltChain chain={watch.chain} truncated={watch.truncated} />
        {!compact && (
          <div className="bg-surface px-3 py-2 text-sm text-muted">
            {plural(watch.defenses, 'defense')} over {plural(watch.weeksHeld, 'week')} ·{' '}
            <Link to="/lineal" className="font-semibold text-text underline-offset-2 hover:underline">
              the full lineage
            </Link>
          </div>
        )}
      </div>
    </RecapPanel>
  )
}
