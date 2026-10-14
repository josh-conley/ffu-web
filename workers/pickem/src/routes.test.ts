// @vitest-environment node
import { drawnCup } from '../../../src/test/drawnCup'
import { EMPTY_PICKS, pickBracket, setDrop, setWinner, type CupPicks } from '../../../src/lib/cupPickem'
import type { Tournament } from '../../../src/data/types'
import { route, type Deps } from './routes'
import { memoryStore } from './store.memory'
import { allowedOrigin } from './http'

const LOCK = Date.parse(drawnCup.pickemLocksAt!)
const team = drawnCup.participants[0]!.ffuId
const other = drawnCup.participants[1]!.ffuId

/** A complete bracket: always the first-listed team, and the first winner as the drop. */
function fullPicks(): CupPicks {
  let picks = EMPTY_PICKS
  for (const round of drawnCup.rounds) {
    pickBracket(drawnCup, picks).find((r) => r.key === round.key)!.slots.forEach((s, j) => {
      picks = setWinner(drawnCup, picks, round.key, j, s.a!)
    })
    const r = pickBracket(drawnCup, picks).find((x) => x.key === round.key)!
    if (r.needsDrop) picks = setDrop(drawnCup, picks, round.key, r.slots[0]!.pick!)
  }
  return picks
}
const picks = fullPicks()

function setup(t: Tournament | null = drawnCup) {
  let clock = LOCK - 86_400_000
  const store = memoryStore()
  const deps: Deps = { store, loadTournament: async () => t, now: () => clock, adminToken: 'sekrit' }
  const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const res = await route(new Request(`https://api.test${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), deps)
    return { status: res.status, body: (await res.json()) as Record<string, unknown> }
  }
  return { store, call, setClock: (ms: number) => (clock = ms) }
}

describe('pick-em routes', () => {
  it('saves an entry and hides picks on the board until the lock', async () => {
    const { call } = setup()
    expect((await call('PUT', `/v1/2026/entries/${team}`, { picks })).status).toBe(200)
    const board = await call('GET', '/v1/2026')
    expect(board.body).toMatchObject({ open: true, locked: false, entries: [{ ffuId: team }] })
    expect((board.body.entries as object[])[0]).not.toHaveProperty('picks')
  })

  it('replaces a team\'s entry on a later save', async () => {
    const { call, store } = setup()
    await call('PUT', `/v1/2026/entries/${team}`, { picks })
    await call('PUT', `/v1/2026/entries/${team}`, { picks })
    expect(store.rows.size).toBe(1)
  })

  it('rejects bad input', async () => {
    const { call } = setup()
    expect((await call('PUT', `/v1/2026/entries/${team}`, { picks: EMPTY_PICKS })).body.error).toBe('The bracket is not complete')
    expect((await call('PUT', '/v1/2026/entries/not-a-team', { picks })).status).toBe(404)
    expect((await call('PUT', `/v1/2026/entries/${team}`, 'x'.repeat(20_000))).status).toBe(413)
    expect((await call('PATCH', `/v1/2026/entries/${team}`, {})).status).toBe(405)
  })

  it('refuses entries once locked, then shows everyone their picks', async () => {
    const { call, setClock } = setup()
    await call('PUT', `/v1/2026/entries/${team}`, { picks })
    setClock(LOCK)
    expect((await call('PUT', `/v1/2026/entries/${team}`, { picks })).body.error).toBe("Pick'em is locked")
    expect((await call('PUT', `/v1/2026/entries/${other}`, { picks })).status).toBe(403)
    const board = await call('GET', '/v1/2026')
    expect(board.body).toMatchObject({ open: false, locked: true, entries: [{ ffuId: team, picks }] })
  })

  it('stays closed before the draw or without a lock time', async () => {
    expect((await setup({ ...drawnCup, participants: [] }).call('GET', '/v1/2026')).body).toMatchObject({ open: false, locked: false })
    const noLock = { ...drawnCup, pickemLocksAt: undefined }
    expect((await setup(noLock).call('PUT', `/v1/2026/entries/${team}`, { picks })).status).toBe(403)
    expect((await setup(null).call('GET', '/v1/2026')).status).toBe(404)
  })

  it('lets only the admin token remove an entry', async () => {
    const { call } = setup()
    await call('PUT', `/v1/2026/entries/${team}`, { picks })
    expect((await call('DELETE', `/v1/2026/entries/${team}`, undefined, { Authorization: 'Bearer nope' })).status).toBe(401)
    expect((await call('DELETE', `/v1/2026/entries/${team}`, undefined, { Authorization: 'Bearer sekrit' })).status).toBe(200)
    expect((await call('GET', '/v1/2026')).body.entries).toEqual([])
  })
})

describe('allowedOrigin', () => {
  const list = 'https://ffunion.com,http://localhost:5173'
  it('allows the listed sites and branch previews only', () => {
    expect(allowedOrigin('https://ffunion.com', list)).toBe('https://ffunion.com')
    expect(allowedOrigin('https://preview-cup-pickem.ffu-web-preview.pages.dev', list)).toBeDefined()
    expect(allowedOrigin('https://evil.example', list)).toBeUndefined()
    expect(allowedOrigin('https://x.ffu-web-preview.pages.dev.evil.example', list)).toBeUndefined()
    expect(allowedOrigin(null, list)).toBeUndefined()
  })
})
