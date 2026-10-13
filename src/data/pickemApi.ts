import type { Tournament } from './types'
import { EMPTY_PICKS, pickBracket, setDrop, setWinner, validatePicks, type CupPicks } from '@/lib/cupPickem'

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

// ── DEMO BUILD ONLY (branch preview/pickem-demo, never merged) ─────────────────────────────────
// No server: entries live in this browser's localStorage, with the same rules the Worker enforces
// (PIN to change or load, complete bracket only). A few rival brackets are seeded so the entrants
// list and the leaderboard have something in them. Add `&demo=locked` to the URL to see the
// after-lock leaderboard, scored against the real 2025 weeks 6–12.

interface DemoRow {
  pin: string
  picks: CupPicks
  updatedAt: string
}

const KEY = 'pickem-demo-entries'
const RIVALS = 6

const isLocked = () => new URLSearchParams(window.location.search).get('demo') === 'locked'

function read(): Record<string, DemoRow> {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? '{}') as Record<string, DemoRow>
  } catch {
    return {}
  }
}

function write(rows: Record<string, DemoRow>): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(rows))
  } catch {
    // private mode: the demo still works for this page view
  }
}

/** A plausible bracket: mostly the better seed, with some upsets, varying per rival. */
function rivalPicks(t: Tournament, n: number): CupPicks {
  let x = n * 7919 + 13
  const rand = () => ((x = (x * 48271) % 2147483647) / 2147483647)
  const seed = new Map(t.participants.map((p) => [p.ffuId, p.seed ?? 99]))
  let picks = EMPTY_PICKS
  for (const round of t.rounds) {
    pickBracket(t, picks).find((r) => r.key === round.key)!.slots.forEach((s, j) => {
      const fav = seed.get(s.a!)! < seed.get(s.b!)! ? s.a! : s.b!
      picks = setWinner(t, picks, round.key, j, rand() < 0.7 ? fav : fav === s.a ? s.b! : s.a!)
    })
    const r = pickBracket(t, picks).find((y) => y.key === round.key)!
    if (r.needsDrop) picks = setDrop(t, picks, round.key, r.slots[Math.floor(rand() * r.slots.length)]!.pick!)
  }
  return picks
}

async function demoTournament(year: string): Promise<Tournament> {
  const res = await fetch(`/data/${year}/tournament.json`)
  return (await res.json()) as Tournament
}

async function rows(year: string): Promise<Record<string, DemoRow>> {
  const stored = read()
  if (Object.keys(stored).length > 0) return stored
  const t = await demoTournament(year)
  const seeded: Record<string, DemoRow> = {}
  t.participants.slice(-RIVALS).forEach((p, i) => {
    seeded[p.ffuId] = { pin: '0000', picks: rivalPicks(t, i + 1), updatedAt: new Date().toISOString() }
  })
  write(seeded)
  return seeded
}

const pause = () => new Promise((r) => setTimeout(r, 250))

export async function fetchPickemBoard(year: string): Promise<PickemBoard> {
  await pause()
  const locked = isLocked()
  const all = await rows(year)
  return {
    locksAt: locked ? undefined : '2026-10-16T00:15:00Z',
    open: !locked,
    locked,
    entries: Object.entries(all).map(([ffuId, r]) => ({ ffuId, updatedAt: r.updatedAt, ...(locked ? { picks: r.picks } : {}) })),
  }
}

export async function savePickemEntry(year: string, ffuId: string, pin: string, picks: CupPicks): Promise<void> {
  await pause()
  const all = await rows(year)
  const existing = all[ffuId]
  if (existing && existing.pin !== pin) throw new PickemError(401, 'Wrong PIN for this team')
  const checked = validatePicks(await demoTournament(year), picks)
  if (typeof checked === 'string') throw new PickemError(400, checked)
  all[ffuId] = { pin, picks: checked, updatedAt: new Date().toISOString() }
  write(all)
}

export async function loadPickemEntry(year: string, ffuId: string, pin: string): Promise<CupPicks> {
  await pause()
  const existing = (await rows(year))[ffuId]
  if (!existing) throw new PickemError(404, 'No entry for this team yet')
  if (existing.pin !== pin) throw new PickemError(401, 'Wrong PIN for this team')
  return existing.picks
}
