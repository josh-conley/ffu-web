import type { Tournament } from '../data/types'
import { bracketSlots, drawCup } from '../lib/cupDraw.mjs'

// A full, seeded 36-team Cup as the draw writes it — opening round in bracket order, the real
// round flags — for tests of anything that walks the bracket (pick'em engine, scoring, Worker).

const mk = (p: string) => Array.from({ length: 12 }, (_, i) => ({ ffuId: `${p}-${i + 1}`, name: `${p} ${i + 1}` }))

export const cupDraw = drawCup({ PREMIER: mk('p'), MASTERS: mk('m'), NATIONAL: mk('n') }, '47')

export const drawnCup: Tournament = {
  schemaVersion: 1,
  name: 'FFU Cup',
  year: '2026',
  fieldSize: 36,
  participants: cupDraw.participants,
  rounds: [
    { key: 'r36', label: 'Round of 36', week: 6, matchups: bracketSlots(cupDraw).map((i) => cupDraw.matchups[i]!) },
    { key: 'r18', label: 'Round of 18', week: 7 },
    { key: 'r8', label: 'Quarterfinals', week: 8, dropLowestWinner: true, reseed: true },
    { key: 'r4', label: 'Semifinals', week: 10 },
    { key: 'final', label: 'Final', week: 12 },
  ],
  pickemLocksAt: '2026-10-16T00:15:00Z',
}

export const seedOf = new Map(cupDraw.participants.map((p) => [p.ffuId, p.seed]))
