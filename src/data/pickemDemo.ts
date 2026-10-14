import type { Tier } from '@/config/types'
import { bracketSlots, drawCup } from '@/lib/cupDraw.mjs'
import { EMPTY_PICKS, pickBracket, setDrop, setWinner, validatePicks, type CupPicks } from '@/lib/cupPickem'
import { provider } from './index'
import type { SeasonData, Tournament } from './types'
import { PickemError, type PickemBoard } from './pickemApi'

// PREVIEW BUILDS ONLY (see PICKEM_DEMO in config/cup.ts): the pick'em with no server, so a preview
// can be clicked through before the Worker is deployed or the season's draw is held.
//   - The Cup is a demo draw over last season's 36 teams, so the after-lock leaderboard is scored
//     against real results (that season's weeks 6–12).
//   - Entries live in this browser's localStorage, under the rules the Worker enforces (complete
//     brackets only; saving replaces the team's entry). Six rival brackets are seeded.
//   - `?demo=locked` shows the after-lock leaderboard.
// Loaded with a dynamic import, so a production bundle never fetches it.

export const DEMO_YEAR = '2025'
const TIERS: Tier[] = ['PREMIER', 'MASTERS', 'NATIONAL']
const KEY = 'pickem-demo-entries'
const RIVALS = 6

export interface DemoCup {
  tournament: Tournament
  seasons: SeasonData[]
}

let cup: Promise<DemoCup> | undefined

/** The demo Cup: a fixed-seed draw over DEMO_YEAR's teams, with the real round flags and weeks. */
export function loadDemoCup(): Promise<DemoCup> {
  cup ??= (async () => {
    const seasons = await Promise.all(TIERS.map((tier) => provider.getSeason(tier, DEMO_YEAR)))
    const field = Object.fromEntries(seasons.map((s) => [s.tier, s.teams.map((t) => ({ ffuId: t.memberId, name: t.memberId }))]))
    const d = drawCup(field as Parameters<typeof drawCup>[0], 'pickem-demo')
    const tournament: Tournament = {
      schemaVersion: 1,
      name: "FFU Cup (pick'em demo)",
      year: DEMO_YEAR,
      fieldSize: 36,
      participants: d.participants,
      rounds: [
        { key: 'r36', label: 'Round of 36', week: 6, matchups: bracketSlots(d).map((i) => d.matchups[i]!) },
        { key: 'r18', label: 'Round of 18', week: 7 },
        { key: 'r8', label: 'Quarterfinals', week: 8, dropLowestWinner: true, reseed: true },
        { key: 'r4', label: 'Semifinals', week: 10 },
        { key: 'final', label: 'Final', week: 12 },
      ],
      pickemLocksAt: '2099-01-01T00:00:00Z',
    }
    return { tournament, seasons }
  })()
  return cup
}

interface DemoRow {
  picks: CupPicks
  updatedAt: string
}

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
    // Storage blocked (private mode): the demo still works for this page view.
  }
}

/** A plausible bracket: mostly the better seed, some upsets, different for each rival. */
export function rivalPicks(t: Tournament, n: number): CupPicks {
  let x = n * 7919 + 13
  const rand = () => (x = (x * 48271) % 2147483647) / 2147483647
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

/**
 * A bracket one pick short of the drop pick: every Round of 36 game and all but the last Round of 18
 * game picked, nothing later. The demo starts here so the drop prompt can be tried in one tap.
 */
export function onePickFromDrop(t: Tournament): CupPicks {
  const full = rivalPicks(t, 99)
  const r18 = [...(full.winners.r18 ?? [])]
  r18[r18.length - 1] = null
  return { winners: { r36: full.winners.r36 ?? [], r18 }, drops: {} }
}

async function rows(): Promise<Record<string, DemoRow>> {
  const stored = read()
  if (Object.keys(stored).length > 0) return stored
  const { tournament } = await loadDemoCup()
  const seeded: Record<string, DemoRow> = {}
  tournament.participants.slice(-RIVALS).forEach((p, i) => {
    seeded[p.ffuId] = { picks: rivalPicks(tournament, i + 1), updatedAt: new Date().toISOString() }
  })
  write(seeded)
  return seeded
}

const isLocked = () => new URLSearchParams(window.location.search).get('demo') === 'locked'

export async function fetchDemoBoard(): Promise<PickemBoard> {
  const locked = isLocked()
  const all = await rows()
  return {
    locksAt: locked ? undefined : '2026-10-16T00:15:00Z',
    open: !locked,
    locked,
    entries: Object.entries(all).map(([ffuId, r]) => ({ ffuId, updatedAt: r.updatedAt, ...(locked ? { picks: r.picks } : {}) })),
  }
}

export async function saveDemoEntry(ffuId: string, picks: CupPicks): Promise<void> {
  const all = await rows()
  const checked = validatePicks((await loadDemoCup()).tournament, picks)
  if (typeof checked === 'string') throw new PickemError(400, checked)
  all[ffuId] = { picks: checked, updatedAt: new Date().toISOString() }
  write(all)
}
