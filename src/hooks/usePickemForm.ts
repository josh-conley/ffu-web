import { useEffect, useMemo, useState } from 'react'
import type { Tournament } from '@/data'
import { savePickemEntry } from '@/data'
import { EMPTY_PICKS, dropOwed, isComplete, parsePicks, pickBracket, picksOf, setDrop, setWinner, type CupPicks, type PickRound } from '@/lib/cupPickem'

// State and actions behind the pick'em entry form, kept out of the component: who the member is,
// the bracket being filled in, and saving it. The bracket rules themselves are lib/cupPickem.
//
// The bracket in progress is remembered in this browser (localStorage), so a member can leave and
// come back to edit it. The API deliberately never hands picks back before the lock (nobody's
// picks are visible till then), so this browser copy is the only way back in to one; on another
// device a member starts over, and saving replaces their entry.

/** `missing`: Submit was pressed before the entry could be saved: who's entering, or which picks. */
export type MissingPart = 'who' | 'drop' | 'games'
export type FormStatus =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'saved' }
  | { kind: 'missing'; part: MissingPart }
  | { kind: 'error'; message: string }

export interface PickemForm {
  ffuId: string
  setFfuId: (id: string) => void
  bracket: PickRound[]
  complete: boolean
  pick: (roundKey: string, index: number, ffuId: string) => void
  drop: (roundKey: string, ffuId: string) => void
  reset: () => void
  save: () => Promise<void>
  status: FormStatus
}

export interface Draft {
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

/** Replaces the remembered bracket (the preview demo uses it to set up a scenario). */
export function writeDraft(year: string, draft: Draft): void {
  try {
    window.localStorage.setItem(draftKey(year), JSON.stringify(draft))
  } catch {
    // Storage blocked (private mode): the form still works, it just won't be remembered.
  }
}

const messageOf = (err: unknown) => (err instanceof Error ? err.message : String(err))

export function usePickemForm(t: Tournament, year: string, onSaved: () => void): PickemForm {
  const [draft] = useState(() => readDraft(t, year))
  const [ffuId, setTeam] = useState(draft.ffuId)
  const [picks, setPicks] = useState<CupPicks>(draft.picks)
  const [status, setStatus] = useState<FormStatus>({ kind: 'idle' })
  const bracket = useMemo(() => pickBracket(t, picks), [t, picks])
  useEffect(() => writeDraft(year, { ffuId, picks }), [year, ffuId, picks])

  const edit = (next: (p: CupPicks) => CupPicks) => {
    setPicks(next)
    setStatus({ kind: 'idle' })
  }

  return {
    ffuId,
    setFfuId: (id) => {
      setTeam(id)
      setStatus({ kind: 'idle' })
    },
    bracket,
    complete: isComplete(bracket),
    pick: (roundKey, index, id) => edit((p) => setWinner(t, p, roundKey, index, id)),
    drop: (roundKey, id) => edit((p) => setDrop(t, p, roundKey, id)),
    reset: () => edit(() => EMPTY_PICKS),
    save: async () => {
      // Checked here rather than by disabling Submit: a dead button doesn't say what it's waiting for.
      const missing: MissingPart | undefined = ffuId === '' ? 'who' : isComplete(bracket) ? undefined : dropOwed(bracket) ? 'drop' : 'games'
      if (missing) return setStatus({ kind: 'missing', part: missing })
      setStatus({ kind: 'busy' })
      try {
        await savePickemEntry(year, ffuId, picks)
        onSaved()
        setStatus({ kind: 'saved' })
      } catch (err) {
        setStatus({ kind: 'error', message: messageOf(err) })
      }
    },
    status,
  }
}
