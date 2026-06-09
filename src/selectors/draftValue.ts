import type { Era } from '@/config'
import { isPlayoffWeek } from '@/config'
import type { DraftData, DraftPick, SeasonLineups } from '@/data'

// Draft ROI: what each pick actually returned. "Rostered points" are the REGULAR-SEASON points a
// player recorded on any roster in the league (starts + bench) — deliberately not his full NFL
// season: weeks spent unrostered aren't captured, and playoff weeks are excluded because only
// teams still playing have lineups then (a uniform 1..14 window keeps the ranking fair). Value is
// position-relative (drafted RB12, finished RB3 → +9): raw points would just rank QBs first.

export interface PickValue {
  pick: DraftPick
  /** Regular-season points recorded in any lineup (started or benched). */
  rosteredPoints: number
  /** Regular-season weeks in a starting lineup (any roster). */
  starts: number
  /** Nth player of his position taken in this draft (1-based). */
  posPicked: number
  /** Finish at his position by rostered points, among drafted players (1-based). */
  posFinish: number
  /** posPicked - posFinish: positive = outplayed his draft slot, negative = bust territory. */
  value: number
}

/** playerId → regular-season totals from the lineup files (starts + bench both count). */
function playerTotals(lineups: SeasonLineups, era: Era): Map<string, { points: number; starts: number }> {
  const totals = new Map<string, { points: number; starts: number }>()
  const add = (playerId: string, points: number, started: boolean) => {
    const t = totals.get(playerId) ?? { points: 0, starts: 0 }
    t.points += points
    if (started) t.starts += 1
    totals.set(playerId, t)
  }
  for (const wk of lineups.weeks) {
    if (isPlayoffWeek(wk.week, era)) continue
    for (const team of wk.teams) {
      for (const p of team.starters) add(p.playerId, p.points, true)
      for (const p of team.bench) add(p.playerId, p.points, false)
    }
  }
  return totals
}

/** Every pick's return, position-ranked within this draft. Sorted by value, best first. */
export function draftValues(draft: DraftData, lineups: SeasonLineups, era: Era): PickValue[] {
  const totals = playerTotals(lineups, era)
  const byPosition = new Map<string, DraftPick[]>()
  for (const pick of draft.picks) {
    const group = byPosition.get(pick.player.position) ?? []
    group.push(pick)
    byPosition.set(pick.player.position, group)
  }

  const results: PickValue[] = []
  for (const group of byPosition.values()) {
    const points = (p: DraftPick) => totals.get(p.player.id)?.points ?? 0
    const picked = [...group].sort((a, b) => a.overall - b.overall)
    // Ties go to the earlier pick so equal outputs don't manufacture value out of draft order.
    const finished = [...group].sort((a, b) => points(b) - points(a) || a.overall - b.overall)
    const finishIndex = new Map(finished.map((p, i) => [p.overall, i + 1]))
    picked.forEach((pick, i) => {
      const posPicked = i + 1
      const posFinish = finishIndex.get(pick.overall)!
      results.push({
        pick,
        rosteredPoints: points(pick),
        starts: totals.get(pick.player.id)?.starts ?? 0,
        posPicked,
        posFinish,
        value: posPicked - posFinish,
      })
    })
  }
  return results.sort((a, b) => b.value - a.value || b.rosteredPoints - a.rosteredPoints)
}

export interface MemberDraftValue {
  memberId: string
  picks: number
  /** Combined regular-season rostered points of everyone this member drafted. */
  points: number
  /** Mean pick value — the "who drafted best" number. */
  avgValue: number
  best: PickValue
  worst: PickValue
}

/** Per-member draft report card, best drafter first. */
export function memberDraftValues(values: PickValue[]): MemberDraftValue[] {
  const byMember = new Map<string, PickValue[]>()
  for (const v of values) {
    const group = byMember.get(v.pick.memberId) ?? []
    group.push(v)
    byMember.set(v.pick.memberId, group)
  }
  const summaries = [...byMember.entries()].map(([memberId, picks]) => {
    const sum = (f: (v: PickValue) => number) => picks.reduce((acc, v) => acc + f(v), 0)
    const best = picks.reduce((a, b) => (b.value > a.value ? b : a))
    const worst = picks.reduce((a, b) => (b.value < a.value ? b : a))
    return { memberId, picks: picks.length, points: sum((v) => v.rosteredPoints), avgValue: sum((v) => v.value) / picks.length, best, worst }
  })
  return summaries.sort((a, b) => b.avgValue - a.avgValue)
}
