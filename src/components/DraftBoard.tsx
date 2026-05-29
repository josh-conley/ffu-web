import type { DraftData, DraftPick } from '@/data'
import { TeamLogo } from './TeamLogo'

const POS_COLOR: Record<string, string> = {
  QB: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  RB: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  WR: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  TE: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  K: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
  DEF: 'bg-surface-2 text-muted',
}
const posClass = (p: string) => POS_COLOR[p] ?? 'bg-surface-2 text-muted'

/** Map slot → team. Prefer draftOrder; fall back to round-1 picks if it's empty. */
function teamsBySlot(draft: DraftData): Map<number, string> {
  const bySlot = new Map<number, string>()
  for (const [memberId, slot] of Object.entries(draft.draftOrder)) bySlot.set(slot, memberId)
  if (bySlot.size === 0) {
    for (const p of draft.picks) if (p.round === 1) bySlot.set(p.slot, p.memberId)
  }
  return bySlot
}

export function DraftBoard({ draft }: { draft: DraftData }) {
  const teamBySlot = teamsBySlot(draft)
  const slots = [...teamBySlot.keys()].sort((a, b) => a - b)
  const byCell = new Map<string, DraftPick>()
  for (const p of draft.picks) byCell.set(`${p.round}-${p.slot}`, p)
  const rounds = Array.from({ length: draft.rounds }, (_, i) => i + 1)

  return (
    // Full-bleed on phones (cancel the page's px-4) so the board uses the whole screen width
    // and ~4 columns are visible at a time, Sleeper-style; constrained again at md.
    <div className="-mx-4 overflow-x-auto border-y border-border bg-surface shadow-sm md:mx-0 md:border">
      <table className="text-xs">
        <thead className="bg-surface-2">
          <tr>
            <th className="px-2 py-2 text-muted">Rd</th>
            {slots.map((slot) => (
              <th key={slot} className="px-2 py-2">
                <span className="flex flex-col items-center gap-1">
                  {teamBySlot.get(slot) && <TeamLogo ffuId={teamBySlot.get(slot)!} size={20} />}
                  <span className="text-muted">{slot}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rounds.map((round) => (
            <tr key={round} className="hover:bg-surface-2">
              <td className="px-2 py-1 text-center text-muted">{round}</td>
              {slots.map((slot) => {
                const pick = byCell.get(`${round}-${slot}`)
                return (
                  <td key={slot} className="px-2 py-1 align-top">
                    {pick && (
                      <div className="w-20 md:w-28">
                        <div className="truncate font-medium" title={pick.player.name}>{pick.player.name}</div>
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted">
                          <span className={`rounded px-1 font-semibold ${posClass(pick.player.position)}`}>{pick.player.position}</span>
                          {pick.player.nflTeam && <span>{pick.player.nflTeam}</span>}
                        </div>
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
