import { useMemo, useState } from 'react'
import type { Tournament } from '@/data'
import { loadPickemEntry, savePickemEntry } from '@/data'
import { EMPTY_PICKS, isComplete, pickBracket, setDrop, setWinner, type CupPicks, type PickRound } from '@/lib/cupPickem'

// State and actions behind the pick'em entry form, kept out of the component: which team, its PIN,
// the bracket being filled in, and talking to the API. The bracket rules themselves are lib/cupPickem.

export type FormStatus = { kind: 'idle' } | { kind: 'busy' } | { kind: 'saved' } | { kind: 'loaded' } | { kind: 'error'; message: string }

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

const messageOf = (err: unknown) => (err instanceof Error ? err.message : String(err))

export function usePickemForm(t: Tournament, year: string, onSaved: () => void): PickemForm {
  const [ffuId, setTeam] = useState('')
  const [pin, setPin] = useState('')
  const [picks, setPicks] = useState<CupPicks>(EMPTY_PICKS)
  const [status, setStatus] = useState<FormStatus>({ kind: 'idle' })
  const bracket = useMemo(() => pickBracket(t, picks), [t, picks])

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
    // A different team is a different entry: start its PIN over (its picks stay, to save typing).
    setFfuId: (id) => {
      setTeam(id)
      setPin('')
      setStatus({ kind: 'idle' })
    },
    pin,
    setPin,
    bracket,
    complete: isComplete(bracket),
    pick: (roundKey, index, id) => setPicks((p) => setWinner(t, p, roundKey, index, id)),
    drop: (roundKey, id) => setPicks((p) => setDrop(t, p, roundKey, id)),
    reset: () => setPicks(EMPTY_PICKS),
    save: () =>
      run(async () => {
        await savePickemEntry(year, ffuId, pin, picks)
        onSaved()
        return { kind: 'saved' }
      }),
    load: () =>
      run(async () => {
        setPicks(await loadPickemEntry(year, ffuId, pin))
        return { kind: 'loaded' }
      }),
    status,
  }
}
