import type { Tournament } from '../../../src/data/types'
import { validatePicks } from '../../../src/lib/cupPickem'
import { fail, json, readBody, safeEqual } from './http'
import type { EntryStore } from './store'
import type { TournamentLoader } from './tournament'

// The pick'em API. Every rule a member could get around in the browser is enforced here:
//   - only the Cup's own 36 teams can enter, one entry each;
//   - an entry is a complete bracket consistent with the draw (validatePicks, shared with the page);
//   - nothing is written after the lock (the Cup's own `pickemLocksAt`);
//   - nobody's picks are visible until the lock (the page keeps a member's own bracket in their
//     browser to edit it, so the API never hands picks back early).
// There is deliberately no PIN: a member picks their team from a list, and saving replaces that
// team's entry (Josh's call, 2026-10-14; README.md "Known limits").
//
//   GET    /v1/:year                 the board: lock state + entries (picks only once locked)
//   PUT    /v1/:year/entries/:ffuId  create or replace the team's entry   {picks}
//   DELETE /v1/:year/entries/:ffuId  commissioner removal (Bearer ADMIN_TOKEN)

export interface Deps {
  store: EntryStore
  loadTournament: TournamentLoader
  now: () => number
  /** Unset = no admin route. */
  adminToken?: string
}

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

async function save(year: string, ffuId: string, state: CupState, request: Request, deps: Deps): Promise<Response> {
  if (!state.open) return fail(403, state.locked ? "Pick'em is locked" : "Pick'em isn't open")
  const body = await readBody(request)
  if (body instanceof Response) return body
  const picks = validatePicks(state.t, body.picks)
  if (typeof picks === 'string') return fail(400, picks)
  const now = deps.now()
  await deps.store.upsert(year, ffuId, JSON.stringify(picks), now)
  return json({ ffuId, updatedAt: new Date(now).toISOString() })
}

async function reset(year: string, ffuId: string, request: Request, deps: Deps): Promise<Response> {
  const auth = request.headers.get('Authorization') ?? ''
  if (!deps.adminToken || !safeEqual(auth, `Bearer ${deps.adminToken}`)) return fail(401, 'Not authorized')
  return (await deps.store.remove(year, ffuId)) ? json({ ffuId, removed: true }) : fail(404, 'No entry for this team')
}

const ROUTE = /^\/v1\/(\d{4})(?:\/entries\/([a-z0-9-]{1,32}))?\/?$/

export async function route(request: Request, deps: Deps): Promise<Response> {
  const match = ROUTE.exec(new URL(request.url).pathname)
  if (!match) return fail(404, 'Not found')
  const [, year, ffuId] = match as unknown as [string, string, string | undefined]
  const t = await deps.loadTournament(year)
  if (t === null) return fail(404, `No Cup in ${year}`)
  const state = cupState(t, deps.now())

  if (ffuId === undefined) return request.method === 'GET' ? board(year, state, deps) : fail(405, 'Method not allowed')
  if (!t.participants.some((p) => p.ffuId === ffuId)) return fail(404, 'That team is not in the Cup')
  if (request.method === 'PUT') return save(year, ffuId, state, request, deps)
  if (request.method === 'DELETE') return reset(year, ffuId, request, deps)
  return fail(405, 'Method not allowed')
}
