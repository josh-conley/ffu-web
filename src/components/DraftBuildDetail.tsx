import type { DraftPick } from '@/data'
import type { BuildStat } from '@/selectors'
import { nameForYear } from '@/config'
import { FaCheck, FaXmark } from 'react-icons/fa6'
import { LEAGUE_STYLES } from './leagues'
import { posClass } from './positions'
import { TeamLogo } from './TeamLogo'

// Drill-down for one build: every team-season that drafted it, with the actual roster (its picks in
// the first N rounds). Presentational only — the page owns selection state; positions come from
// positions.ts, tier colors from leagues.ts (Charter DRY).

/** One drafted player as a colored position pill + name. */
function pickPill(pick: DraftPick) {
  return (
    <span key={pick.overall} className="inline-flex items-center gap-1 whitespace-nowrap">
      <span className={`px-1 py-0.5 text-[10px] font-bold ${posClass(pick.player.position)}`}>{pick.player.position}</span>
      <span className="text-sm">{pick.player.name}</span>
    </span>
  )
}

function InstanceRow({ inst }: { inst: BuildStat['instances'][number] }) {
  const tier = LEAGUE_STYLES[inst.tier]
  return (
    <div className="flex flex-col gap-1.5 border-b border-border py-2.5 last:border-b-0 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex items-center gap-2.5 sm:min-w-64 sm:shrink-0">
        {inst.madePlayoffs ? (
          <FaCheck className="shrink-0 text-positive" title="Made playoffs" aria-label="Made playoffs" />
        ) : (
          <FaXmark className="shrink-0 text-muted" title="Missed playoffs" aria-label="Missed playoffs" />
        )}
        <span className="flex flex-col items-start gap-0.5">
          <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase ${tier.badge}`}>{tier.label}</span>
          <span className="text-xs tabular-nums text-muted">{inst.year}</span>
        </span>
        <TeamLogo ffuId={inst.memberId} size={18} />
        <span className="font-medium">{nameForYear(inst.memberId, inst.year) ?? inst.memberId}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">{inst.picks.map(pickPill)}</div>
    </div>
  )
}

export function DraftBuildDetail({ build, threshold, onClose }: { build: BuildStat; threshold: number; onClose: () => void }) {
  return (
    <section className="border border-border bg-surface" aria-label={`Teams that drafted ${build.label}`}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-2 px-4 py-2.5">
        <div className="text-sm">
          <span className="font-bold">{build.label}</span>
          <span className="text-muted">
            {' '}· {build.teams} {build.teams === 1 ? 'team' : 'teams'} · {build.playoffTeams} made playoffs (
            {Math.round(build.playoffPct * 100)}%) · first {threshold} {threshold === 1 ? 'round' : 'rounds'}
          </span>
        </div>
        <button type="button" onClick={onClose} className="text-sm font-semibold text-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          Close ✕
        </button>
      </header>
      <div className="max-h-96 overflow-y-auto px-4">
        {build.instances.map((inst) => (
          <InstanceRow key={`${inst.year}-${inst.tier}-${inst.memberId}`} inst={inst} />
        ))}
      </div>
    </section>
  )
}
