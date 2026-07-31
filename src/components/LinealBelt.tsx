import { FaCrown } from 'react-icons/fa6'
import { getMember, nameForYear, ownerNames } from '@/config'
import type { LinealReign } from '@/selectors'
import { GameWhen } from './GameWhen'
import { TeamLogo } from './TeamLogo'

/** One headline number in the hero's stat strip. */
function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xl font-extrabold tabular-nums leading-none">{value}</span>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
    </div>
  )
}

/**
 * Front-and-centre answer to "who holds the belt right now" — the current reign, how it started,
 * and how long it has lasted.
 */
export function LinealBelt({ reign }: { reign: LinealReign }) {
  const { championId, wonAt, wonFrom } = reign
  // Present tense — the belt-holder goes by their current name, however they were named when they won it.
  const name = getMember(championId)?.name ?? championId
  const owners = ownerNames(championId)

  return (
    <section className="border border-border bg-surface shadow-sm">
      <span aria-hidden className="block h-1 bg-accent" />
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <TeamLogo ffuId={championId} size={64} />
          <div className="min-w-0">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-accent">
              <FaCrown aria-hidden /> Lineal Champion
            </span>
            <h2 className="mt-1 truncate text-xl font-extrabold">{name}</h2>
            {owners.length > 0 && <p className="truncate text-sm text-muted">{owners.join(' & ')}</p>}
          </div>
        </div>
        <div className="flex gap-6 sm:gap-8">
          <Stat value={`#${reign.order}`} label="Reign" />
          <Stat value={reign.defenses} label={reign.defenses === 1 ? 'Defense' : 'Defenses'} />
          <Stat value={reign.weeksHeld} label="Weeks Held" />
        </div>
      </div>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border px-5 py-3 text-sm">
        <span className="text-muted">{wonFrom === null ? 'Won the first FFU title over' : 'Took the belt from'}</span>
        <span className="font-semibold">{nameForYear(reign.wonBout.opponentId, wonAt.year) ?? reign.wonBout.opponentId}</span>
        <span className="font-mono text-xs tabular-nums text-muted">
          {reign.wonBout.score.toFixed(2)}–{reign.wonBout.opponentScore.toFixed(2)}
        </span>
        <GameWhen year={wonAt.year} tier={wonAt.tier} week={wonAt.week} round={wonAt.round} />
      </p>
    </section>
  )
}
