import { useEffect, useRef } from 'react'
import type { SeasonData, Tournament } from '@/data'
import type { Tier } from '@/config/types'
import { nameForYear, ownerNames } from '@/config'
import { dropOwed } from '@/lib/cupPickem'
import { usePickemForm, type FormStatus, type MissingPart, type PickemForm } from '@/hooks/usePickemForm'
import { BUTTON, SELECT } from '../../controls'
import { PickemBracket } from './PickemBracket'

// Filling in a bracket: say who you are, tap through the rounds, save. Saving again replaces your
// entry; the bracket in progress is remembered in this browser (usePickemForm).

function StatusLine({ status, entered, dropLabel }: { status: FormStatus; entered: boolean; dropLabel: string }) {
  if (status.kind === 'error') return <p role="alert" className="text-sm font-semibold text-negative">{status.message}</p>
  if (status.kind === 'missing') return <p role="alert" className="text-sm font-semibold text-negative">{MISSING[status.part](dropLabel)}</p>
  if (status.kind === 'saved') return <p role="status" className="text-sm font-semibold text-positive">Saved. You can change it until entries lock.</p>
  if (entered) return <p className="text-sm text-muted">You&apos;ve entered. Saving again replaces your bracket.</p>
  return null
}

const MISSING: Record<MissingPart, (dropLabel: string) => string> = {
  who: () => 'Choose who you are first (“Who are you?”, at the top).',
  drop: (label) => `Pick which ${label} winner is dropped first (top of the Quarterfinals column).`,
  games: () => 'Pick a winner in every game first.',
}

/** What's still missing, named: the drop pick gets its own line, since it's the easy one to miss. */
function MissingStep({ form, dropLabel }: { form: PickemForm; dropLabel: string }) {
  if (dropOwed(form.bracket)) {
    return <span className="text-sm font-semibold text-text">Next: pick which {dropLabel} winner is dropped (top of the Quarterfinals column).</span>
  }
  if (!form.complete) return <span className="text-sm text-muted">Pick every game, plus the {dropLabel} team that gets dropped.</span>
  if (form.ffuId === '') return <span className="text-sm font-semibold text-text">Bracket done. Now choose who you are at the top.</span>
  return null
}

function FormActions({ form, hasEntry, dropLabel }: { form: PickemForm; hasEntry: boolean; dropLabel: string }) {
  // Disabled only mid-save: otherwise Submit says what's missing instead of sitting there dead.
  const busy = form.status.kind === 'busy'
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
      <button type="submit" className={`${BUTTON} border-accent bg-accent text-accent-fg hover:bg-accent-hover`} disabled={busy}>
        {busy ? 'Saving…' : hasEntry ? 'Save changes' : 'Submit bracket'}
      </button>
      <button type="button" className={BUTTON} disabled={busy} onClick={form.reset}>Clear picks</button>
      <MissingStep form={form} dropLabel={dropLabel} />
    </div>
  )
}

/** Moves to "Who are you?" when Submit finds nobody chosen, so the fix is one tap away. */
function useFocusWho(status: FormStatus) {
  const ref = useRef<HTMLSelectElement>(null)
  const whoMissing = status.kind === 'missing' && status.part === 'who'
  useEffect(() => {
    if (!whoMissing || !ref.current) return
    ref.current.scrollIntoView?.({ block: 'center' })
    ref.current.focus({ preventScroll: true })
  }, [whoMissing, status])
  return ref
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
  const who = useFocusWho(form.status)
  const dropLabel = form.bracket.find((r) => r.needsDrop)?.label ?? ''
  const shown = form.status

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
        <select ref={who} className={`${SELECT} w-full`} value={form.ffuId} onChange={(e) => form.setFfuId(e.target.value)}>
          <option value="">Choose yourself…</option>
          {whoOptions(tournament, year).map((o) => <option key={o.ffuId} value={o.ffuId}>{o.label}{entered.has(o.ffuId) ? ' ✓' : ''}</option>)}
        </select>
      </label>
      {shown.kind === 'missing' && shown.part === 'who' ? (
        <StatusLine status={shown} entered={false} dropLabel={dropLabel} />
      ) : (
        form.ffuId && <StatusLine status={{ kind: 'idle' }} entered={hasEntry} dropLabel={dropLabel} />
      )}

      <PickemBracket bracket={form.bracket} year={year} tierOf={tierOf} seasons={seasons} onPick={form.pick} onDrop={form.drop} />

      <FormActions form={form} hasEntry={hasEntry} dropLabel={dropLabel} />
      {/* By the button, so the result of pressing it is seen without scrolling back up. */}
      {(shown.kind === 'saved' || shown.kind === 'error' || shown.kind === 'missing') && <StatusLine status={shown} entered={hasEntry} dropLabel={dropLabel} />}
    </form>
  )
}
