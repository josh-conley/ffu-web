import { getMember } from '@/config'
import { winPct, type CommonOpponents, type WinLoss } from '@/selectors'
import { recordLabel } from '../format'
import { teamAbbr } from '../seriesText'
import { BETTER_TEXT } from './better'

// Every team both members have played, each side's record against it: the detail behind the
// "Vs Common Opp." rows. Folded away by default, since a long rivalry has thirty-odd of them.

function Record({ r, lead }: { r: WinLoss; lead: boolean }) {
  return <span className={`font-mono tabular-nums ${lead ? BETTER_TEXT : ''}`}>{recordLabel(r)}</span>
}

export function CommonOpponentsTable({ aId, bId, common }: { aId: string; bId: string; common: CommonOpponents }) {
  if (common.opponents.length === 0) {
    return <p className="border border-dashed border-border bg-surface/60 p-4 text-sm text-muted">No opponent in common yet.</p>
  }
  // Columns hug their content and a trailing empty one takes the spare width, so a record sits
  // beside its opponent's name instead of across the card. Nothing wraps: on a phone it scrolls.
  const TH = 'w-px px-3 py-2 font-bold'
  return (
    <details className="border border-border bg-surface shadow-sm">
      <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">
        {common.opponents.length} common opponents · {teamAbbr(aId)} {recordLabel(common.a)} · {teamAbbr(bId)} {recordLabel(common.b)}
      </summary>
      <div className="overflow-x-auto border-t border-border">
        <table className="w-full whitespace-nowrap text-sm">
          <caption className="sr-only">Records against common opponents</caption>
          <thead className="bg-surface-2">
            <tr className="text-xs uppercase tracking-wider text-muted">
              <th scope="col" className={`${TH} text-left`}>Opponent</th>
              <th scope="col" className={`${TH} text-right`}>{teamAbbr(aId)}</th>
              <th scope="col" className={`${TH} text-right`}>{teamAbbr(bId)}</th>
              <th aria-hidden="true" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {common.opponents.map(({ opponentId, a, b }) => (
              <tr key={opponentId} className="hover:bg-surface-2">
                <th scope="row" className="px-3 py-1.5 text-left font-medium">{getMember(opponentId)?.name ?? opponentId}</th>
                <td className="px-3 py-1.5 text-right"><Record r={a} lead={winPct(a) > winPct(b)} /></td>
                <td className="px-3 py-1.5 text-right"><Record r={b} lead={winPct(b) > winPct(a)} /></td>
                <td aria-hidden="true" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
