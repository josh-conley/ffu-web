import { Fragment } from 'react'
import { nameForYear } from '@/config'
import type { RecordCategory, RecordEntry, RecordSection } from '@/selectors'
import { TeamLogo } from './TeamLogo'

const TH = 'px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-muted'
const TD = 'px-3 py-2 align-middle'
const BLANK = <span className="text-muted">—</span>

/** One record row. Renders the holder + value when computed; a muted dash while the metric is TBD. */
function RecordRow({ category, entry }: { category: RecordCategory; entry: RecordEntry | undefined }) {
  return (
    <tr className="hover:bg-surface-2">
      <td className={TD}>
        <span className="font-medium">{category.label}</span>
        {category.note && <span className="ml-1 text-[11px] text-muted">({category.note})</span>}
      </td>
      <td className={`${TD} text-right font-mono font-bold tabular-nums`}>{entry ? entry.value : BLANK}</td>
      <td className={TD}>
        {entry ? (
          <span className="flex items-center gap-2 whitespace-nowrap">
            <TeamLogo ffuId={entry.teamId} size={20} />
            <span className="font-medium">{nameForYear(entry.teamId, entry.year) ?? entry.teamId}</span>
          </span>
        ) : (
          BLANK
        )}
      </td>
      <td className={`${TD} whitespace-nowrap tabular-nums text-muted`}>
        {entry ? `${entry.yearsLabel}${entry.note ? ` · ${entry.note}` : ''}` : '—'}
      </td>
    </tr>
  )
}

/** A record-book section: a titled, square table of its categories (grouped where the spec groups them). */
export function RecordBookSection({ section, entries }: { section: RecordSection; entries: Map<string, RecordEntry> }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-extrabold uppercase tracking-widest text-accent">{section.title}</h2>
      <div className="overflow-x-auto border border-border bg-surface shadow-sm">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="border-b border-border bg-surface-2">
            <tr>
              <th className={TH}>Category</th>
              <th className={`${TH} text-right`}>Record</th>
              <th className={TH}>Team</th>
              <th className={TH}>Year(s)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {section.groups.map((group, gi) => (
              <Fragment key={group.heading ?? gi}>
                {group.heading && (
                  <tr>
                    <td colSpan={4} className="bg-surface-2/60 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted">
                      {group.heading}
                    </td>
                  </tr>
                )}
                {group.categories.map((c) => (
                  <RecordRow key={c.id} category={c} entry={entries.get(c.id)} />
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
