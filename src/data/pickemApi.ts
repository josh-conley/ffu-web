import { CUP_PICKEM_API } from '@/config'
import { parsePicks, type CupPicks } from '@/lib/cupPickem'

// The Cup pick'em API (workers/pickem): the site's one read-WRITE data source, and a separate path
// from LeagueDataProvider for the same reason liveSleeper is — it isn't league history, it's a
// live service with its own lifecycle. Responses are checked at this seam like every other source.

export interface PickemEntry {
  ffuId: string
  updatedAt: string
  /** Present only once the pick'em has locked (nobody sees anyone's picks before). */
  picks?: CupPicks
}

export interface PickemBoard {
  locksAt: string | undefined
  open: boolean
  locked: boolean
  entries: PickemEntry[]
}

/** A refusal from the API, carrying its message (written for members: "Wrong PIN for this team"). */
export class PickemError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

async function call(path: string, init?: RequestInit): Promise<Record<string, unknown>> {
  let res: Response
  try {
    res = await fetch(`${CUP_PICKEM_API}${path}`, init)
  } catch {
    throw new PickemError(0, "Couldn't reach the pick'em server. Check your connection and try again.")
  }
  const body: unknown = await res.json().catch(() => undefined)
  if (!res.ok) throw new PickemError(res.status, isRecord(body) && typeof body.error === 'string' ? body.error : `HTTP ${res.status}`)
  if (!isRecord(body)) throw new PickemError(res.status, "Unexpected answer from the pick'em server")
  return body
}

function toEntry(raw: unknown): PickemEntry {
  if (!isRecord(raw) || typeof raw.ffuId !== 'string' || typeof raw.updatedAt !== 'string') throw new PickemError(200, 'Bad pick-em entry')
  const picks = raw.picks === undefined ? undefined : parsePicks(raw.picks)
  return { ffuId: raw.ffuId, updatedAt: raw.updatedAt, ...(picks ? { picks } : {}) }
}

export async function fetchPickemBoard(year: string): Promise<PickemBoard> {
  const raw = await call(`/v1/${year}`)
  if (!Array.isArray(raw.entries)) throw new PickemError(200, 'Bad pick-em board')
  return {
    locksAt: typeof raw.locksAt === 'string' ? raw.locksAt : undefined,
    open: raw.open === true,
    locked: raw.locked === true,
    entries: raw.entries.map(toEntry),
  }
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

/** Creates the team's entry (setting its PIN) or, with the right PIN, replaces its picks. */
export async function savePickemEntry(year: string, ffuId: string, pin: string, picks: CupPicks): Promise<void> {
  await call(`/v1/${year}/entries/${encodeURIComponent(ffuId)}`, jsonInit('PUT', { pin, picks }))
}

/** A team's saved picks, for editing; needs its PIN. */
export async function loadPickemEntry(year: string, ffuId: string, pin: string): Promise<CupPicks> {
  const raw = await call(`/v1/${year}/entries/${encodeURIComponent(ffuId)}/load`, jsonInit('POST', { pin }))
  const picks = parsePicks(raw.picks)
  if (!picks) throw new PickemError(200, 'Bad saved picks')
  return picks
}
