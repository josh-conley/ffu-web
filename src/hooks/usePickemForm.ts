import { useEffect, useMemo, useState } from 'react'
import type { Tournament } from '@/data'
import { loadPickemEntry, savePickemEntry } from '@/data'
import { EMPTY_PICKS, dropOwed, isComplete, parsePicks, pickBracket, picksOf, setDrop, setWinner, type CupPicks, type PickRound } from '@/lib/cupPickem'

// State and actions behind the pick'em entry form, kept out of the component: who the member is,
// their PIN, the bracket being filled in, and talking to the API. The bracket rules themselves are
// lib/cupPickem.
//
// A team's first save sets its PIN; saving again, or loading the saved bracket back (say, on
// another device), needs it. The bracket in progress is also remembered in this browser
// (localStorage), so a member can leave and come back without loading it. The PIN never is.

export const PIN_PATTERN = /^\d{4,8}$/

/** `missing`: Submit was pressed before the entry could be saved: who's entering, their PIN, or picks. */
export type MissingPart = 'who' | 'pin' | 'drop' | 'games'
export type FormStatus =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'saved' }
  | { kind: 'loaded' }
  | { kind: 'missing'; part: MissingPart }
  | { kind: 'error'; message: string }

export interface PickemForm {
  ffuId: string
  setFfuId: (id: string) => void
  pin: string
  setPin: (pin: string) => void
  bracket: PickRound[]
  complete: boolean
  pick: (roundKey: string, index: number, ffuId: string) => void
  drop: (roundKey: string, ffuId: string) => void
  reset: () => void
  save: () => Promise<void>
  load: () => Promise<void>
  status: FormStatus
}

interface Draft {
  ffuId: string
  picks: CupPicks
}

const draftKey = (year: string) => `ffu-pickem-draft-${year}`

/** The saved draft, with any pick that no longer fits this Cup dropped. Never throws. */
function readDraft(t: Tournament, year: string): Draft {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(draftKey(year)) ?? 'null')
    const obj = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
    const picks = parsePicks(obj.picks)
    return { ffuId: typeof obj.ffuId === 'string' ? obj.ffuId : '', picks: picks ? picksOf(pickBracket(t, picks)) : EMPTY_PICKS }
  } catch {
    return { ffuId: '', picks: EMPTY_PICKS }
  }
}

function writeDraft(year: string, draft: Draft): void {
  try {
    window.localStorage.setItem(draftKey(year), JSON.stringify(draft))
  } catch {
    // Storage blocked (private mode): the form still works, it just won't be remembered.
  }
}

const messageOf = (err: unknown) => (err instanceof Error ? err.message : String(err))

/** Why Submit can't save yet, in the order the form asks for things; undefined = ready. */
function missingPart(ffuId: string, pin: string, bracket: PickRound[]): MissingPart | undefined {
  if (ffuId === '') return 'who'
  if (!PIN_PATTERN.test(pin)) return 'pin'
  if (isComplete(bracket)) return undefined
  return dropOwed(bracket) ? 'drop' : 'games'
}

export function usePickemForm(t: Tournament, year: string, onSaved: () => void): PickemForm {
  const [draft] = useState(() => readDraft(t, year))
  const [ffuId, setTeam] = useState(draft.ffuId)
  const [pin, setPinValue] = useState('')
  const [picks, setPicks] = useState<CupPicks>(draft.picks)
  const [status, setStatus] = useState<FormStatus>({ kind: 'idle' })
  const bracket = useMemo(() => pickBracket(t, picks), [t, picks])
  useEffect(() => writeDraft(year, { ffuId, picks }), [year, ffuId, picks])

  const edit = (next: (p: CupPicks) => CupPicks) => {
    setPicks(next)
    setStatus({ kind: 'idle' })
  }

  async function run(action: () => Promise<FormStatus>) {
    setStatus({ kind: 'busy' })
    try {
      setStatus(await action())
    } catch (err) {
      setStatus({ kind: 'error', message: messageOf(err) })
    }
  }

  return {
    ffuId,
    // A different team is a different entry: start its PIN over (the picks stay, to save tapping).
    setFfuId: (id) => {
      setTeam(id)
      setPinValue('')
      setStatus({ kind: 'idle' })
    },
    pin,
    setPin: (value) => setPinValue(value.replace(/\D/g, '').slice(0, 8)),
    bracket,
    complete: isComplete(bracket),
    pick: (roundKey, index, id) => edit((p) => setWinner(t, p, roundKey, index, id)),
    drop: (roundKey, id) => edit((p) => setDrop(t, p, roundKey, id)),
    reset: () => edit(() => EMPTY_PICKS),
    save: async () => {
      // Checked here rather than by disabling Submit: a dead button doesn't say what it's waiting for.
      const missing = missingPart(ffuId, pin, bracket)
      if (missing) return setStatus({ kind: 'missing', part: missing })
      await run(async () => {
        await savePickemEntry(year, ffuId, pin, picks)
        onSaved()
        return { kind: 'saved' }
      })
    },
    load: () =>
      run(async () => {
        setPicks(picksOf(pickBracket(t, await loadPickemEntry(year, ffuId, pin))))
        return { kind: 'loaded' }
      }),
    status,
  }
}
