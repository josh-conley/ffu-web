import type { DraftPick } from '@/data'
import type { BuildInstance, BuildStat } from '@/selectors'
import { nameForYear } from '@/config'
import { FaToilet, FaTrophy } from 'react-icons/fa6'
import { ordinal } from './format'
import { LEAGUE_STYLES } from './leagues'
import { posClass } from './positions'
import { TeamLogo } from './TeamLogo'

// Drill-down for one build: every team-season that drafted it, with the actual roster (its picks in
// the first N rounds) and how the season finished. Presentational only — the page owns selection
// state; positions come from positions.ts, tier colors from leagues.ts (Charter DRY).

/** Leading finish tag: trophy for a title, toilet for dead last, else the ordinal (green within top-6). */
function FinishTag({ inst }: { inst: BuildInstance }) {
  const { finalPlacement: p, seasonSize } = inst
  if (p === 1) return <span className="inline-flex items-center gap-1 font-bold text-amber-500"><FaTrophy size={11} />1st</span>
  if (p === seasonSize) return <span className="inline-flex items-center gap-1 font-bold text-negative"><FaToilet size={11} />Last</span>
  return <span className={`tabular-nums ${p <= 6 ? 'text-positive' : 'text-muted'}`}>{ordinal(p)}</span>
}

/** One drafted player as a colored position pill + name. */
function pickPill(pick: DraftPick) {
  return (
    <span key={pick.overall} className="inline-flex items-center gap-1 whitespace-nowrap">
      <span className={`px-1 py-0.5 text-[10px] font-bold ${posClass(pick.player.position)}`}>{pick.player.position}</span>
      <span className="text-sm">{pick.player.name}</span>
    </span>
  )
}

function InstanceRow({ inst }: { inst: BuildInstance }) {
  const tier = LEAGUE_STYLES[inst.tier]
  return (
    <div className="flex flex-col gap-1.5 border-b border-border py-2.5 last:border-b-0 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex items-center gap-2.5 sm:min-w-72 sm:shrink-0">
        <span className="w-12 shrink-0 text-sm"><FinishTag inst={inst} /></span>
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
            {' '}· {build.teams} {build.teams === 1 ? 'team' : 'teams'} · {build.first.count} 🏆 · {build.top6.count} top 6 ·{' '}
            {build.top9.count} top 9 · first {threshold} {threshold === 1 ? 'round' : 'rounds'}
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
