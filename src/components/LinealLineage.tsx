import { FaCrown } from 'react-icons/fa6'
import { nameForYear } from '@/config'
import type { LinealReign } from '@/selectors'
import { GameWhen } from './GameWhen'
import { TeamLogo } from './TeamLogo'

const score = (n: number) => n.toFixed(2)

/** "beat X 125.45–121.00" — how a reign began (or ended, from the loser's side). */
function Bout({ year, oppId, forScore, againstScore }: { year: string; oppId: string; forScore: number; againstScore: number }) {
  return (
    <span className="flex flex-wrap items-center gap-x-1.5">
      <span className="font-medium">{nameForYear(oppId, year) ?? oppId}</span>
      <span className="font-mono text-xs tabular-nums text-muted">
        {score(forScore)}–{score(againstScore)}
      </span>
    </span>
  )
}

function ReignRow({ reign }: { reign: LinealReign }) {
  const { championId, wonAt, wonFrom, lostAt, lostTo } = reign
  const name = nameForYear(championId, wonAt.year) ?? championId
  // The title-changing game is the reign's last one; its scores label the loss from the champ's side.
  const finalGame = reign.titleGames.at(-1)

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
      <span className="w-8 shrink-0 text-sm font-bold tabular-nums text-muted">#{reign.order}</span>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <TeamLogo ffuId={championId} size={32} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-bold">{name}</span>
            {reign.current && <FaCrown className="shrink-0 text-accent" aria-label="Current lineal champion" />}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted">
            <span>{wonFrom === null ? 'Won the first FFU title over' : 'Beat'}</span>
            <Bout
              year={wonAt.year}
              oppId={reign.wonBout.opponentId}
              forScore={reign.wonBout.score}
              againstScore={reign.wonBout.opponentScore}
            />
            <GameWhen year={wonAt.year} tier={wonAt.tier} week={wonAt.week} round={wonAt.round} />
          </div>
        </div>
      </div>

      <div className="flex shrink-0 gap-5 text-sm sm:w-64 sm:justify-end">
        <span className="tabular-nums">
          <strong>{reign.defenses}</strong> <span className="text-muted">def</span>
        </span>
        <span className="tabular-nums">
          <strong>{reign.weeksHeld}</strong> <span className="text-muted">wks</span>
        </span>
      </div>

      <div className="min-w-0 shrink-0 text-sm sm:w-72">
        {lostAt === null || lostTo === null || finalGame === undefined ? (
          <span className="font-semibold text-accent">Still holds the belt</span>
        ) : (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-muted">Lost to</span>
            <Bout year={lostAt.year} oppId={lostTo} forScore={finalGame.challengerScore} againstScore={finalGame.championScore} />
            <GameWhen year={lostAt.year} tier={lostAt.tier} week={lostAt.week} round={lostAt.round} />
          </span>
        )}
      </div>
    </li>
  )
}

/** The full chain of title-holders, most recent first. */
export function LinealLineage({ reigns }: { reigns: LinealReign[] }) {
  return (
    <ul className="divide-y divide-border border border-border bg-surface shadow-sm">
      {reigns.map((reign) => (
        <ReignRow key={reign.order} reign={reign} />
      ))}
    </ul>
  )
}
