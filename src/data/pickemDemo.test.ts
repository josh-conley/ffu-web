import type { Tier } from '@/config/types'
import premier from '../../public/data/2025/premier.json'
import masters from '../../public/data/2025/masters.json'
import national from '../../public/data/2025/national.json'
import { drawnCup } from '@/test/drawnCup'
import { validatePicks } from '@/lib/cupPickem'
import { fetchDemoBoard, loadDemoCup, loadDemoEntry, rivalPicks, saveDemoEntry } from './pickemDemo'

// The demo Cup is drawn from the real 2025 season files.
const seasons = vi.hoisted(() => ({} as Record<string, unknown>))
vi.mock('./index', () => ({ provider: { getSeason: async (tier: Tier) => seasons[tier] } }))
Object.assign(seasons, { PREMIER: premier, MASTERS: masters, NATIONAL: national })

beforeEach(() => window.localStorage.clear())

it('seeds rivals with complete, valid brackets', () => {
  for (let n = 1; n <= 6; n++) expect(typeof validatePicks(drawnCup, rivalPicks(drawnCup, n))).not.toBe('string')
})

it('draws a full 36-team demo Cup from last season and keeps entries to the PIN rules', async () => {
  const { tournament } = await loadDemoCup()
  expect(tournament.participants).toHaveLength(36)
  const board = await fetchDemoBoard()
  expect(board).toMatchObject({ open: true, locked: false })
  expect(board.entries).toHaveLength(6)

  const team = tournament.participants[0]!.ffuId
  const picks = rivalPicks(tournament, 42)
  await saveDemoEntry(team, '4821', picks)
  await expect(saveDemoEntry(team, '1111', picks)).rejects.toThrow('Wrong PIN for this team')
  await expect(loadDemoEntry(team, '4821')).resolves.toEqual(picks)
  expect((await fetchDemoBoard()).entries).toHaveLength(7)
})
