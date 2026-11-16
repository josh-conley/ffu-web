import { nameForYear } from '@/config'
import { levelOnHeadToHead, type SeedTie } from '@/selectors'
import { formatPoints, recordLabel } from '../format'

// The working behind one team's ties, for the tiebreak popover: who was level, each team's record
// against the others, their points, and a sentence on what decided it.

function contextLine(tie: SeedTie, divisionName: string | undefined): string {
  const record = recordLabel(tie.record)
  if (tie.context === 'division') return `Level at ${record} for the ${divisionName ?? 'division'} title`
  if (tie.context === 'divisionWinners') return `Division winners level at ${record}, for the byes`
  return `Level at ${record} for the remaining seeds`
}

function verdict(tie: SeedTie, memberId: string, name: (id: string) => string): string {
  if (tie.step === 'h2h') return `Head to head separated them: ${name(memberId)} went ${recordLabel(tie.teams.find((t) => t.memberId === memberId)!.headToHead)} against the others.`
  const level = levelOnHeadToHead(tie, memberId)
  if (level.length === tie.teams.length - 1) return 'Head to head was level, so points for decided.'
  return `Level on head to head with ${level.map(name).join(' and ')}, so points for decided.`
}

function TieBlock({ tie, memberId, year, divisionName }: { tie: SeedTie; memberId: string; year: string; divisionName?: string }) {
  const name = (id: string) => nameForYear(id, year) ?? id
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">{contextLine(tie, divisionName)}</p>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border text-muted">
            <th scope="col" className="py-1 text-left font-semibold">Team</th>
            <th scope="col" className="py-1 text-right font-semibold" title="Record in games against the other tied teams">H2H</th>
            <th scope="col" className="py-1 text-right font-semibold" title="Points for">PF</th>
          </tr>
        </thead>
        <tbody>
          {tie.teams.map((t) => (
            <tr key={t.memberId} className={t.memberId === memberId ? 'bg-pick font-bold' : ''}>
              <td className="max-w-40 truncate py-1 pr-2">{name(t.memberId)}</td>
              <td className="py-1 text-right tabular-nums">{recordLabel(t.headToHead)}</td>
              <td className="py-1 pl-2 text-right tabular-nums">{formatPoints(t.pointsFor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-dim">{verdict(tie, memberId, name)}</p>
    </div>
  )
}

export function TiebreakDetail({ ties, memberId, year, divisionName }: { ties: readonly SeedTie[]; memberId: string; year: string; divisionName?: string }) {
  return (
    <div className="space-y-4">
      {ties.map((tie) => (
        <TieBlock key={tie.context} tie={tie} memberId={memberId} year={year} {...(divisionName === undefined ? {} : { divisionName })} />
      ))}
    </div>
  )
}
