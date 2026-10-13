import type { Tournament } from '../../../src/data/types'
import { validatePicks } from '../../../src/lib/cupPickem'
import { fail, json, readBody } from './http'
import { hashPin, PIN_PATTERN, safeEqual, verifyPin } from './pin'
import type { EntryStore, StoredEntry } from './store'
import type { TournamentLoader } from './tournament'

// The pick'em API. Every rule a member could get around in the browser is enforced here:
//   - only the Cup's own 36 teams can enter, one entry each;
//   - an entry is a complete bracket consistent with the draw (validatePicks, shared with the page);
//   - nothing is written after the lock (the Cup's own `pickemLocksAt`);
//   - changing or reading back an entry before the lock needs its PIN, and wrong PINs are capped;
//   - nobody's picks are visible to anyone else until the lock.
//
//   GET    /v1/:year                      the board: lock state + entries (picks only once locked)
//   PUT    /v1/:year/entries/:ffuId       create (sets the PIN) or update (needs it)  {pin, picks}
//   POST   /v1/:year/entries/:ffuId/load  read back your own picks to edit them       {pin}
//   DELETE /v1/:year/entries/:ffuId       commissioner reset (Bearer ADMIN_TOKEN)

export interface Deps {
  store: EntryStore
  loadTournament: TournamentLoader
  now: () => number
  /** Unset = no admin route. */
  adminToken?: string
}

/** Five wrong PINs, then one more try an hour: under 30 guesses a day, so even a 4-digit PIN holds
 *  through the few days entries are open. */
export const MAX_FAILURES = 5
export const LOCKOUT_MS = 60 * 60_000

interface CupState {
  t: Tournament
  locksAt: number | undefined
  open: boolean
  locked: boolean
}

function cupState(t: Tournament, now: number): CupState {
  const locksAt = t.pickemLocksAt !== undefined ? Date.parse(t.pickemLocksAt) : undefined
  const locked = locksAt !== undefined && now >= locksAt
  const open = locksAt !== undefined && !locked && t.participants.length > 0
  return { t, locksAt, open, locked }
}

async function board(year: string, state: CupState, deps: Deps): Promise<Response> {
  const entries = await deps.store.list(year)
  return json({
    year,
    locksAt: state.locksAt !== undefined ? new Date(state.locksAt).toISOString() : null,
    open: state.open,
    locked: state.locked,
    entries: entries.map((e) => ({
      ffuId: e.ffuId,
      updatedAt: new Date(e.updatedAt).toISOString(),
      ...(state.locked ? { picks: JSON.parse(e.picks) as unknown } : {}),
    })),
  })
}

/** Checks a PIN against an entry, counting the attempt first. Undefined = good; else the error to send. */
async function checkPin(year: string, entry: StoredEntry, pin: unknown, deps: Deps): Promise<Response | undefined> {
  const now = deps.now()
  if (!(await deps.store.claimAttempt(year, entry.ffuId, now, MAX_FAILURES, now + LOCKOUT_MS))) {
    return fail(429, 'Too many wrong PINs. Try again in an hour, or ask the commissioner to reset it.')
  }
  if (typeof pin !== 'string' || !PIN_PATTERN.test(pin) || !(await verifyPin(pin, entry.pinHash, entry.pinSalt))) {
    return fail(401, 'Wrong PIN for this team')
  }
  await deps.store.clearAttempts(year, entry.ffuId)
  return undefined
}

async function save(year: string, ffuId: string, state: CupState, request: Request, deps: Deps): Promise<Response> {
  if (!state.open) return fail(403, state.locked ? "Pick'em is locked" : "Pick'em isn't open")
  const body = await readBody(request)
  if (body instanceof Response) return body
  const picks = validatePicks(state.t, body.picks)
  if (typeof picks === 'string') return fail(400, picks)
  const serialized = JSON.stringify(picks)
  const now = deps.now()

  const existing = await deps.store.get(year, ffuId)
  if (existing === null) {
    if (typeof body.pin !== 'string' || !PIN_PATTERN.test(body.pin)) return fail(400, 'PIN must be 4 to 8 digits')
    const { hash, salt } = await hashPin(body.pin)
    const entry = { ffuId, pinHash: hash, pinSalt: salt, picks: serialized, createdAt: now, updatedAt: now, failedAttempts: 0, lockedUntil: null }
    if (await deps.store.create(year, entry)) return json({ ffuId, updatedAt: new Date(now).toISOString(), created: true }, 201)
    // Someone else's first save landed in between: theirs stands, and this one now needs their PIN.
    return fail(409, 'This team already has an entry. Enter its PIN to change it.')
  }
  const denied = await checkPin(year, existing, body.pin, deps)
  if (denied) return denied
  await deps.store.savePicks(year, ffuId, serialized, now)
  return json({ ffuId, updatedAt: new Date(now).toISOString(), created: false })
}

async function load(year: string, ffuId: string, request: Request, deps: Deps): Promise<Response> {
  const body = await readBody(request)
  if (body instanceof Response) return body
  const existing = await deps.store.get(year, ffuId)
  if (existing === null) return fail(404, 'No entry for this team yet')
  const denied = await checkPin(year, existing, body.pin, deps)
  if (denied) return denied
  return json({ ffuId, updatedAt: new Date(existing.updatedAt).toISOString(), picks: JSON.parse(existing.picks) as unknown })
}

async function reset(year: string, ffuId: string, request: Request, deps: Deps): Promise<Response> {
  const auth = request.headers.get('Authorization') ?? ''
  if (!deps.adminToken || !safeEqual(auth, `Bearer ${deps.adminToken}`)) return fail(401, 'Not authorized')
  return (await deps.store.remove(year, ffuId)) ? json({ ffuId, removed: true }) : fail(404, 'No entry for this team')
}

const ROUTE = /^\/v1\/(\d{4})(?:\/entries\/([a-z0-9-]{1,32})(\/load)?)?\/?$/

export async function route(request: Request, deps: Deps): Promise<Response> {
  const match = ROUTE.exec(new URL(request.url).pathname)
  if (!match) return fail(404, 'Not found')
  const [, year, ffuId, loadPath] = match as unknown as [string, string, string | undefined, string | undefined]
  const t = await deps.loadTournament(year)
  if (t === null) return fail(404, `No Cup in ${year}`)
  const state = cupState(t, deps.now())

  if (ffuId === undefined) return request.method === 'GET' ? board(year, state, deps) : fail(405, 'Method not allowed')
  if (!t.participants.some((p) => p.ffuId === ffuId)) return fail(404, 'That team is not in the Cup')
  const method = `${request.method}${loadPath ?? ''}`
  if (method === 'PUT') return save(year, ffuId, state, request, deps)
  if (method === 'POST/load') return load(year, ffuId, request, deps)
  if (method === 'DELETE') return reset(year, ffuId, request, deps)
  return fail(405, 'Method not allowed')
}
