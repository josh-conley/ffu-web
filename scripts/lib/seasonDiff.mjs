// Pure comparison of a season file before and after a refresh — the judgment calls the weekly
// refresh needs to make before it may commit, written down as code so they run the same way every
// week (see scripts/check-season-refresh.mjs, which feeds this from git).

/** A game's identity: its week and who played. Scores are what we compare, so they stay out. */
const gameKey = (game) => `${game.week}|${game.participants.map((p) => p.memberId).sort().join('|')}`

const scoresOf = (game) =>
  Object.fromEntries(game.participants.map((p) => [p.memberId, p.score]))

const sameScores = (a, b) => a.participants.every((p) => scoresOf(b)[p.memberId] === p.score)

const fixtureKey = (fixture) => `${fixture.week}|${[...fixture.memberIds].sort().join('|')}`

/**
 * Compare the season file on disk after a refresh (`after`) with the committed one (`before`).
 *
 * - `changed` / `removed`: games that were already written and are now different or gone. Only
 *   COMPLETED weeks are ever written, so a removal means something is wrong upstream and the
 *   refresh must not be committed. A change may be a stat correction: see `splitCorrections`.
 * - `added`: newly completed games — the expected change most weeks.
 * - `scheduleChanged`: the fixture list moved. Not an error (the commissioner may have edited it),
 *   but worth a human knowing.
 */
export function diffSeason(before, after) {
  const afterByKey = new Map(after.games.map((g) => [gameKey(g), g]))
  const beforeKeys = new Set(before.games.map(gameKey))
  const changed = []
  const removed = []
  for (const game of before.games) {
    const now = afterByKey.get(gameKey(game))
    if (now === undefined) removed.push(game)
    else if (!sameScores(game, now)) changed.push({ before: game, after: now })
  }
  const added = after.games.filter((g) => !beforeKeys.has(gameKey(g)))
  const fixtures = (season) => (season.schedule ?? []).map(fixtureKey).sort().join(',')
  return { added, changed, removed, scheduleChanged: fixtures(before) !== fixtures(after) }
}

/** The last week with a completed game, or 0 before week 1. */
export const lastWeekOf = (season) => Math.max(0, ...season.games.map((g) => g.week))

/**
 * Sort `changed` games into stat corrections and changes no refresh should make. The NFL corrects
 * stats for days after a game and Sleeper rescores the week, but the refresh writes a week the
 * Tuesday it ends, so the newest week already committed can legitimately move by the next run
 * (2026 week 7: two Premier scores dropped by 0.1 and 0.5). Anything older has had a full week
 * to settle, so a change there still means something is wrong upstream.
 */
export function splitCorrections(before, changed) {
  const correctable = lastWeekOf(before)
  return {
    corrections: changed.filter((c) => c.before.week === correctable),
    unexpected: changed.filter((c) => c.before.week !== correctable),
  }
}

const winnerOf = (game) => {
  const [a, b] = game.participants
  if (a.score === b.score) return undefined
  return a.score > b.score ? a.memberId : b.memberId
}

/** Whether a changed game now has a different winner (a tie counts as a different result). */
export const resultFlipped = ({ before, after }) => winnerOf(before) !== winnerOf(after)
