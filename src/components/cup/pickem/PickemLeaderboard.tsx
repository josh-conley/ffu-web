import { useMemo, useState } from 'react'
import { nameForYear } from '@/config'
import type { Tier } from '@/config/types'
import type { PickemEntry, Tournament } from '@/data'
import { pickBracket, pickedChampion, type PickRound } from '@/lib/cupPickem'
import { pickOutcomes, rankPickem, scorePickem, type ResolvedTournament } from '@/selectors'
import { TeamLink } from '../../TeamLink'
import { PickemBracket } from './PickemBracket'

// After the lock: every entry, scored live against the played bracket, best first. Tap a row to
// see that member's whole bracket with each pick marked won / lost / still alive.

interface Scored {
  ffuId: string
  bracket: PickRound[]
}

const TH = 'px-2 py-2 text-left text-[11px] font-bold uppercase tracking-widest text-muted'
const TD = 'px-2 py-2 text-sm'

export function PickemLeaderboard({ tournament, played, entries, year, tierOf }: {
  tournament: Tournament
  played: ResolvedTournament
  entries: PickemEntry[]
  year: string
  tierOf: ReadonlyMap<string, Tier>
}) {
  const [shown, setShown] = useState<string>()
  const ranked = useMemo(() => {
    const scored: Scored[] = entries.flatMap((e) => (e.picks ? [{ ffuId: e.ffuId, bracket: pickBracket(tournament, e.picks) }] : []))
    return rankPickem(scored, (s) => scorePickem(s.bracket, played))
  }, [entries, tournament, played])
  const selected = ranked.find((r) => r.entry.ffuId === shown)?.entry

  if (ranked.length === 0) return <p className="text-sm text-muted">Nobody entered a bracket this year.</p>
  const name = (id: string | undefined) => (id ? (nameForYear(id, year) ?? id) : '—')

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto border border-border">
        <table className="w-full min-w-[32rem] border-collapse bg-surface">
          <thead className="border-b border-border bg-surface-2">
            <tr>
              <th className={TH}>#</th>
              <th className={TH}>Team</th>
              <th className={`${TH} text-right`}>Pts</th>
              <th className={`${TH} text-right`}>Max</th>
              <th className={TH}>Champion pick</th>
              <th className={TH}><span className="sr-only">Bracket</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ranked.map(({ entry, score, rank }) => (
              <tr key={entry.ffuId} className={entry.ffuId === shown ? 'bg-surface-2' : undefined}>
                <td className={`${TD} font-mono tabular-nums`}>{rank}</td>
                <td className={TD}><TeamLink ffuId={entry.ffuId} logoSize={20}>{name(entry.ffuId)}</TeamLink></td>
                <td className={`${TD} text-right font-mono font-bold tabular-nums`}>{score.points}</td>
                <td className={`${TD} text-right font-mono tabular-nums text-muted`}>{score.maxPoints}</td>
                <td className={`${TD} truncate`}>{name(pickedChampion(entry.bracket))}</td>
                <td className={`${TD} text-right`}>
                  <button type="button" className="font-semibold text-accent hover:underline" aria-expanded={entry.ffuId === shown}
                    onClick={() => setShown(entry.ffuId === shown ? undefined : entry.ffuId)}>
                    {entry.ffuId === shown ? 'Hide' : 'Bracket'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-widest">{name(selected.ffuId)}&apos;s bracket</h3>
          <PickemBracket bracket={selected.bracket} year={year} tierOf={tierOf} outcomes={pickOutcomes(selected.bracket, played)} />
        </section>
      )}
    </div>
  )
}
