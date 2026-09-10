// Pure Sleeper → FFU domain mapping for the in-progress season. No I/O, no config reads, no
// process exits — everything here is a function of its arguments, so it is unit-tested in
// sleeperSeason.test.mjs and scripts/refresh-live-season.mjs is left holding only fetch + write.

export const round2 = (n) => Math.round(n * 100) / 100

/** roster_id → ffuId. Throws on an unmapped owner: a silently missing team would corrupt the file. */
export function rosterMapOf(rosters, members, tier) {
  const map = new Map()
  const unmapped = []
  for (const r of rosters) {
    const member = r.owner_id && members.get(String(r.owner_id))
    if (!member) unmapped.push(`roster ${r.roster_id} (owner ${r.owner_id ?? 'none'})`)
    else map.set(r.roster_id, member.ffuId)
  }
  if (unmapped.length > 0) {
    throw new Error(`${tier}: Sleeper accounts not in src/config/members.ts:\n    ${unmapped.join('\n    ')}`)
  }
  return map
}

/** Division names + per-roster assignment, or null when the league has none. */
export function divisionsOf(league, rosters) {
  const count = league.settings?.divisions ?? 0
  if (count < 2) return null
  const names = Array.from({ length: count }, (_, i) => ({ id: i + 1, name: league.metadata?.[`division_${i + 1}`] ?? `Division ${i + 1}` }))
  const byRoster = new Map(rosters.map((r) => [r.roster_id, r.settings?.division]))
  return { names, byRoster }
}

/** One week's matchup entries → Games. Byes and unpaired groups are skipped, not guessed at. */
export function gamesForWeek(entries, week, rosterMap) {
  const byMatchup = new Map()
  for (const e of entries) {
    if (e.matchup_id === null || e.matchup_id === undefined) continue // bye
    byMatchup.set(e.matchup_id, [...(byMatchup.get(e.matchup_id) ?? []), e])
  }
  const games = []
  for (const group of byMatchup.values()) {
    if (group.length !== 2) continue
    const participants = group.map((e) => ({ memberId: rosterMap.get(e.roster_id), score: e.points ?? 0 }))
    if (participants.some((p) => p.memberId === undefined)) continue
    games.push({ week, isPlayoff: false, participants })
  }
  return games.sort((a, b) => a.participants[0].memberId.localeCompare(b.participants[0].memberId))
}

/**
 * One week's matchup entries → FIXTURES: who plays whom, no scores.
 *
 * Sleeper publishes every week's pairings before a ball is thrown, so this works for weeks that
 * have not happened. Scores are dropped deliberately — an unplayed matchup reports 0.0 for both
 * sides, and carrying that anywhere near `games` would make it a played tie.
 */
export function fixturesForWeek(entries, week, rosterMap) {
  const byMatchup = new Map()
  for (const e of entries) {
    if (e.matchup_id === null || e.matchup_id === undefined) continue // bye
    byMatchup.set(e.matchup_id, [...(byMatchup.get(e.matchup_id) ?? []), e])
  }
  const out = []
  for (const group of byMatchup.values()) {
    if (group.length !== 2) continue
    const memberIds = group.map((e) => rosterMap.get(e.roster_id))
    if (memberIds.some((id) => id === undefined)) continue
    out.push({ week, memberIds })
  }
  return out.sort((a, b) => a.memberIds[0].localeCompare(b.memberIds[0]))
}

/**
 * Team rows DERIVED from the completed games above, not mirrored from Sleeper's roster aggregates.
 *
 * For a finished season we store Sleeper's own totals as facts (see SeasonTeam in src/data/types.ts).
 * Mid-season we cannot: those aggregates move during the in-progress week we are deliberately
 * excluding, so mirroring them would leave `teams` and `games` disagreeing inside one file — a
 * standings table that doesn't add up to the matchups printed beside it. Deriving from the games we
 * actually wrote keeps the file internally consistent, and January's backfill replaces these rows
 * with Sleeper's finals anyway. See ai-docs/DECISIONS.md.
 */
export function teamsFrom(games, rosterMap, divisions) {
  const rows = new Map()
  for (const ffuId of rosterMap.values()) {
    rows.set(ffuId, { memberId: ffuId, record: { wins: 0, losses: 0, ties: 0 }, points: { for: 0, against: 0 } })
  }
  for (const game of games) {
    const [a, b] = game.participants
    for (const [self, other] of [[a, b], [b, a]]) {
      const row = rows.get(self.memberId)
      row.points.for += self.score
      row.points.against += other.score
      if (self.score > other.score) row.record.wins++
      else if (self.score < other.score) row.record.losses++
      else row.record.ties++
    }
  }
  return [...rosterMap.entries()].map(([rosterId, ffuId]) => {
    const row = rows.get(ffuId)
    const divisionId = divisions?.byRoster.get(rosterId)
    return {
      memberId: ffuId,
      // finalPlacement/placementName are deliberately ABSENT — the season is unfinished, and their
      // absence is what tells selectors so (see standings.ts, which falls back to a live sort).
      ...(divisionId ? { divisionId } : {}),
      record: row.record,
      points: { for: round2(row.points.for), against: round2(row.points.against) },
      promoted: false,
      relegated: false,
    }
  })
}
