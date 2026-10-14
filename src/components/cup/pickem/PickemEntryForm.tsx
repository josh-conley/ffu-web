import type { SeasonData, Tournament } from '@/data'
import type { Tier } from '@/config/types'
import { nameForYear, ownerNames } from '@/config'
import { dropOwed } from '@/lib/cupPickem'
import { usePickemForm, type FormStatus, type PickemForm } from '@/hooks/usePickemForm'
import { BUTTON, SELECT } from '../../controls'
import { PickemBracket } from './PickemBracket'

// Filling in a bracket: say who you are, tap through the rounds, save. Saving again replaces your
// entry; the bracket in progress is remembered in this browser (usePickemForm).

function StatusLine({ status, entered }: { status: FormStatus; entered: boolean }) {
  if (status.kind === 'error') return <p role="alert" className="text-sm font-semibold text-negative">{status.message}</p>
  if (status.kind === 'saved') return <p role="status" className="text-sm font-semibold text-positive">Saved. You can change it until entries lock.</p>
  if (entered) return <p className="text-sm text-muted">You&apos;ve entered. Saving again replaces your bracket.</p>
  return null
}

/** What's still missing, named: the drop pick gets its own line, since it's the easy one to miss. */
function MissingStep({ form }: { form: PickemForm }) {
  const owed = dropOwed(form.bracket)
  if (owed) {
    return <span className="text-sm font-semibold text-text">Next: pick which {owed.label} winner is dropped (top of the Quarterfinals column).</span>
  }
  return <span className="text-sm text-muted">Pick every game, plus the {form.bracket.find((r) => r.needsDrop)?.label ?? ''} team that gets dropped, to submit.</span>
}

function FormActions({ form, canSubmit, hasEntry }: { form: PickemForm; canSubmit: boolean; hasEntry: boolean }) {
  const busy = form.status.kind === 'busy'
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
      <button type="submit" className={`${BUTTON} border-accent bg-accent text-accent-fg hover:bg-accent-hover`} disabled={busy || !canSubmit}>
        {busy ? 'Saving…' : hasEntry ? 'Save changes' : 'Submit bracket'}
      </button>
      <button type="button" className={BUTTON} disabled={busy} onClick={form.reset}>Clear picks</button>
      {!form.complete && <MissingStep form={form} />}
    </div>
  )
}

/** Each Cup team as its owner(s), with the team name: "Josh Conley (Team Name)", A–Z by owner. */
function whoOptions(tournament: Tournament, year: string) {
  return tournament.participants
    .map((p) => {
      const team = nameForYear(p.ffuId, year) ?? p.ffuId
      const owners = ownerNames(p.ffuId).join(' & ')
      return { ffuId: p.ffuId, label: owners ? `${owners} (${team})` : team }
    })
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function PickemEntryForm({ tournament, year, tierOf, seasons, entered, onSaved }: {
  tournament: Tournament
  year: string
  tierOf: ReadonlyMap<string, Tier>
  seasons: SeasonData[]
  /** Teams that already have an entry. */
  entered: ReadonlySet<string>
  onSaved: () => void
}) {
  const form = usePickemForm(tournament, year, onSaved)
  const hasEntry = entered.has(form.ffuId)

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        void form.save()
      }}
    >
      <label className="block max-w-md space-y-1 text-sm">
        <span className="font-semibold">Who are you?</span>
        <select className={`${SELECT} w-full`} value={form.ffuId} onChange={(e) => form.setFfuId(e.target.value)} required>
          <option value="">Choose yourself…</option>
          {whoOptions(tournament, year).map((o) => <option key={o.ffuId} value={o.ffuId}>{o.label}{entered.has(o.ffuId) ? ' ✓' : ''}</option>)}
        </select>
      </label>
      {form.ffuId && <StatusLine status={form.status.kind === 'saved' ? { kind: 'idle' } : form.status} entered={hasEntry} />}

      <PickemBracket bracket={form.bracket} year={year} tierOf={tierOf} seasons={seasons} onPick={form.pick} onDrop={form.drop} />

      <FormActions form={form} canSubmit={form.complete && form.ffuId !== ''} hasEntry={hasEntry} />
      {/* By the button, so the result of a save is seen without scrolling back up. */}
      {(form.status.kind === 'saved' || form.status.kind === 'error') && <StatusLine status={form.status} entered={hasEntry} />}
    </form>
  )
}
