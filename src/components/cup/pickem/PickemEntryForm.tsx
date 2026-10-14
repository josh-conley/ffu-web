import type { SeasonData, Tournament } from '@/data'
import type { Tier } from '@/config/types'
import { nameForYear } from '@/config'
import { usePickemForm, type FormStatus, type PickemForm } from '@/hooks/usePickemForm'
import { BUTTON, SELECT } from '../../controls'
import { PickemBracket } from './PickemBracket'

// Filling in a bracket: pick your team, set (or enter) your PIN, tap through the rounds, save.
// A team that has already entered loads its saved bracket with its PIN, edits it, and saves again.

const INPUT = `${SELECT} w-full`

function StatusLine({ status, entered }: { status: FormStatus; entered: boolean }) {
  if (status.kind === 'error') return <p role="alert" className="text-sm font-semibold text-negative">{status.message}</p>
  if (status.kind === 'saved') return <p role="status" className="text-sm font-semibold text-positive">Saved. You can change it until entries lock.</p>
  if (status.kind === 'loaded') return <p role="status" className="text-sm text-muted">Your saved bracket is loaded. Make changes, then save.</p>
  if (entered) return <p className="text-sm text-muted">This team has an entry. Enter its PIN to load it, or save over it.</p>
  return <p className="text-sm text-muted">New entry: the PIN you choose now is the one you&apos;ll need to change it later.</p>
}

function FormActions({ form, canSubmit, hasEntry }: { form: PickemForm; canSubmit: boolean; hasEntry: boolean }) {
  const busy = form.status.kind === 'busy'
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
      <button type="submit" className={`${BUTTON} border-accent bg-accent text-accent-fg hover:bg-accent-hover`} disabled={busy || !canSubmit}>
        {busy ? 'Saving…' : hasEntry ? 'Save changes' : 'Submit bracket'}
      </button>
      <button type="button" className={BUTTON} disabled={busy} onClick={form.reset}>Clear picks</button>
      {!form.complete && <span className="text-sm text-muted">Pick every game (and the dropped team) to submit.</span>}
    </div>
  )
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
  const teams = tournament.participants
    .map((p) => ({ ffuId: p.ffuId, name: nameForYear(p.ffuId, year) ?? p.ffuId }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const busy = form.status.kind === 'busy'
  const hasEntry = entered.has(form.ffuId)
  const pinOk = /^\d{4,8}$/.test(form.pin)

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        void form.save()
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-semibold">Your team</span>
          <select className={INPUT} value={form.ffuId} onChange={(e) => form.setFfuId(e.target.value)} required>
            <option value="">Choose your team…</option>
            {teams.map((t) => <option key={t.ffuId} value={t.ffuId}>{t.name}{entered.has(t.ffuId) ? ' ✓' : ''}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-semibold">PIN (4–8 digits)</span>
          <input className={INPUT} type="password" inputMode="numeric" autoComplete="off" pattern="\d{4,8}" maxLength={8}
            value={form.pin} onChange={(e) => form.setPin(e.target.value.replace(/\D/g, ''))} required />
        </label>
      </div>
      {form.ffuId && form.status.kind !== 'saved' && <StatusLine status={form.status} entered={hasEntry} />}
      {hasEntry && (
        <button type="button" className={BUTTON} disabled={busy || !pinOk} onClick={() => void form.load()}>
          Load my saved bracket
        </button>
      )}

      <PickemBracket bracket={form.bracket} year={year} tierOf={tierOf} seasons={seasons} onPick={form.pick} onDrop={form.drop} />

      <FormActions form={form} canSubmit={form.complete && form.ffuId !== '' && pinOk} hasEntry={hasEntry} />
      {/* Again by the button, so the result of a save is seen without scrolling back up. */}
      {(form.status.kind === 'saved' || form.status.kind === 'error') && <StatusLine status={form.status} entered={hasEntry} />}
    </form>
  )
}
