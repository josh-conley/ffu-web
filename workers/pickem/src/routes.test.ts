// @vitest-environment node
import { drawnCup } from '../../../src/test/drawnCup'
import { EMPTY_PICKS, pickBracket, setDrop, setWinner, type CupPicks } from '../../../src/lib/cupPickem'
import type { Tournament } from '../../../src/data/types'
import { LOCKOUT_MS, MAX_FAILURES, route, type Deps } from './routes'
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
  it('creates an entry with a PIN, and hides picks on the board until the lock', async () => {
    const { call, store } = setup()
    expect((await call('PUT', `/v1/2026/entries/${team}`, { pin: '4821', picks })).status).toBe(201)
    expect([...store.rows.values()][0]!.pinHash).not.toContain('4821')
    const board = await call('GET', '/v1/2026')
    expect(board.body).toMatchObject({ open: true, locked: false, entries: [{ ffuId: team }] })
    expect((board.body.entries as object[])[0]).not.toHaveProperty('picks')
  })

  it('updates only with the right PIN, and loads picks back for editing', async () => {
    const { call } = setup()
    await call('PUT', `/v1/2026/entries/${team}`, { pin: '4821', picks })
    expect((await call('PUT', `/v1/2026/entries/${team}`, { pin: '0000', picks })).status).toBe(401)
    expect((await call('PUT', `/v1/2026/entries/${team}`, { pin: '4821', picks })).status).toBe(200)
    const loaded = await call('POST', `/v1/2026/entries/${team}/load`, { pin: '4821' })
    expect(loaded.body.picks).toEqual(picks)
    expect((await call('POST', `/v1/2026/entries/${team}/load`, { pin: '1111' })).status).toBe(401)
  })

  it('locks a team out after repeated wrong PINs, even for the right one', async () => {
    const { call, setClock } = setup()
    await call('PUT', `/v1/2026/entries/${team}`, { pin: '4821', picks })
    for (let i = 0; i < MAX_FAILURES; i++) expect((await call('POST', `/v1/2026/entries/${team}/load`, { pin: '9999' })).status).toBe(401)
    expect((await call('POST', `/v1/2026/entries/${team}/load`, { pin: '4821' })).status).toBe(429)
    setClock(LOCK - 86_400_000 + LOCKOUT_MS + 1)
    expect((await call('POST', `/v1/2026/entries/${team}/load`, { pin: '4821' })).status).toBe(200)
  })

  it('rejects bad input', async () => {
    const { call } = setup()
    expect((await call('PUT', `/v1/2026/entries/${team}`, { pin: '12', picks })).status).toBe(400)
    expect((await call('PUT', `/v1/2026/entries/${team}`, { pin: '4821', picks: EMPTY_PICKS })).body.error).toBe('The bracket is not complete')
    expect((await call('PUT', '/v1/2026/entries/not-a-team', { pin: '4821', picks })).status).toBe(404)
    expect((await call('PUT', `/v1/2026/entries/${team}`, 'x'.repeat(20_000))).status).toBe(413)
    expect((await call('PATCH', `/v1/2026/entries/${team}`, {})).status).toBe(405)
  })

  it('refuses entries once locked, then shows everyone their picks', async () => {
    const { call, setClock } = setup()
    await call('PUT', `/v1/2026/entries/${team}`, { pin: '4821', picks })
    setClock(LOCK)
    expect((await call('PUT', `/v1/2026/entries/${team}`, { pin: '4821', picks })).body.error).toBe("Pick'em is locked")
    expect((await call('PUT', `/v1/2026/entries/${other}`, { pin: '4821', picks })).status).toBe(403)
    const board = await call('GET', '/v1/2026')
    expect(board.body).toMatchObject({ open: false, locked: true, entries: [{ ffuId: team, picks }] })
  })

  it('stays closed before the draw or without a lock time', async () => {
    expect((await setup({ ...drawnCup, participants: [] }).call('GET', '/v1/2026')).body).toMatchObject({ open: false, locked: false })
    const noLock = { ...drawnCup, pickemLocksAt: undefined }
    expect((await setup(noLock).call('PUT', `/v1/2026/entries/${team}`, { pin: '4821', picks })).status).toBe(403)
    expect((await setup(null).call('GET', '/v1/2026')).status).toBe(404)
  })

  it('lets only the admin token reset an entry', async () => {
    const { call } = setup()
    await call('PUT', `/v1/2026/entries/${team}`, { pin: '4821', picks })
    expect((await call('DELETE', `/v1/2026/entries/${team}`, undefined, { Authorization: 'Bearer nope' })).status).toBe(401)
    expect((await call('DELETE', `/v1/2026/entries/${team}`, undefined, { Authorization: 'Bearer sekrit' })).status).toBe(200)
    expect((await call('PUT', `/v1/2026/entries/${team}`, { pin: '7777', picks })).status).toBe(201)
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
