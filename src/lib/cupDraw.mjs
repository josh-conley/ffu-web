// The FFU Cup draw — pure and deterministic. Given the three leagues' fields and a seed, it always
// produces the same bracket, which is the whole point: the commissioner publishes the seed BEFORE
// the draw (a number nobody controls, e.g. the combined final score of an announced NFL game), runs
// this, and anyone can re-run the same command and get a byte-identical result. A draw nobody can
// re-check is a bad property for a competition that pays out.
//
// Rules implemented (commissioner's amendment + the 2026-08-20 clarification):
//   1. Premier draws in draft order 1→12, each from ONE pool of all 24 Masters + National teams.
//   2. Once six teams from a league have been drawn, the pool narrows to the other league — so the
//      round opens with exactly six Premier–Masters and six Premier–National matchups.
//   3. The six undrawn Masters teams then draw the six remaining National teams.
//   4. Seeding: drawing teams by draft order (Premier 1–12, then those Masters teams 13–18); every
//      DRAWN team by reverse order of selection (first drawn is 36, down to 19).
//
// No imports: this file is the algorithm, tested in cupDraw.test.mjs.

/** String → 32-bit seed (xmur3), so a seed can be "47" or "week1-mnf-51". */
function xmur3(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}

/** mulberry32 — small, fast, well-distributed; identical across Node versions and platforms. */
function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Deterministic 0–1 generator for a seed. Exported so tests can pin the sequence. */
export function makeRng(seed) {
  return mulberry32(xmur3(String(seed))())
}

/** Removes and returns a uniformly random element of `arr` (mutates — `arr` is a working pool). */
function takeRandom(arr, rng) {
  const i = Math.floor(rng() * arr.length)
  return arr.splice(i, 1)[0]
}

function assert(condition, message) {
  if (!condition) throw new Error(`Cup draw: ${message}`)
}

function validateField(field) {
  for (const tier of ['PREMIER', 'MASTERS', 'NATIONAL']) {
    const teams = field[tier]
    assert(Array.isArray(teams) && teams.length === 12, `${tier} must have exactly 12 teams (got ${teams?.length ?? 0})`)
  }
  const all = [...field.PREMIER, ...field.MASTERS, ...field.NATIONAL]
  assert(new Set(all.map((t) => t.ffuId)).size === 36, 'a team appears in more than one league')
}

/**
 * Phase 1 — Premier draws from the combined pool, quota-constrained.
 * Returns the matchups made and mutates the two pools.
 */
function premierDraws(premier, mastersPool, nationalPool, rng, drawnOrder) {
  const matchups = []
  for (const team of premier) {
    // The quota rule: a league that has given up six teams is closed for the rest of the phase.
    const eligible = mastersPool.length === 6 ? 'NATIONAL' : nationalPool.length === 6 ? 'MASTERS' : null
    const pool = eligible === 'NATIONAL' ? nationalPool : eligible === 'MASTERS' ? mastersPool : null
    let opponent
    if (pool) {
      opponent = takeRandom(pool, rng)
    } else {
      // Both leagues still open: draw from the 24 as ONE pool, so each remaining team is equally
      // likely — NOT "pick a league, then a team", which would skew as the pools diverge in size.
      const combined = mastersPool.length + nationalPool.length
      const i = Math.floor(rng() * combined)
      opponent = i < mastersPool.length ? mastersPool.splice(i, 1)[0] : nationalPool.splice(i - mastersPool.length, 1)[0]
    }
    drawnOrder.push(opponent)
    matchups.push({ a: team.ffuId, b: opponent.ffuId })
  }
  return matchups
}

/** Phase 2 — the undrawn Masters teams, in draft order, draw the remaining National teams. */
function mastersDraws(remainingMasters, nationalPool, rng, drawnOrder) {
  const matchups = []
  for (const team of remainingMasters) {
    const opponent = takeRandom(nationalPool, rng)
    drawnOrder.push(opponent)
    matchups.push({ a: team.ffuId, b: opponent.ffuId })
  }
  return matchups
}

/** Post-conditions the amendment guarantees. A violation is a bug, not a bad draw — refuse to emit. */
function verify(participants, matchups, tierOf) {
  assert(participants.length === 36, `expected 36 participants, got ${participants.length}`)
  const seeds = participants.map((p) => p.seed).sort((a, b) => a - b)
  assert(seeds.every((s, i) => s === i + 1), 'seeds are not exactly 1–36')
  assert(matchups.length === 18, `expected 18 opening matchups, got ${matchups.length}`)
  const pairing = (m) => [tierOf.get(m.a), tierOf.get(m.b)].sort().join('-')
  const counts = {}
  for (const m of matchups) {
    assert(tierOf.get(m.a) !== tierOf.get(m.b), `intra-league matchup: ${m.a} vs ${m.b}`)
    counts[pairing(m)] = (counts[pairing(m)] ?? 0) + 1
  }
  assert(counts['MASTERS-PREMIER'] === 6, `expected 6 Premier–Masters matchups, got ${counts['MASTERS-PREMIER'] ?? 0}`)
  assert(counts['NATIONAL-PREMIER'] === 6, `expected 6 Premier–National matchups, got ${counts['NATIONAL-PREMIER'] ?? 0}`)
  assert(counts['MASTERS-NATIONAL'] === 6, `expected 6 Masters–National matchups, got ${counts['MASTERS-NATIONAL'] ?? 0}`)
}

/** Code-unit order, not localeCompare: it must sort identically on every machine and locale. */
function byFfuId(x, y) {
  return x.ffuId < y.ffuId ? -1 : x.ffuId > y.ffuId ? 1 : 0
}

/**
 * Bracket positions for `n` seeds (a power of two), top to bottom: 1,2 → 1,4,2,3 → 1,8,4,5,2,7,3,6.
 * Each step pairs every seed s with its mirror, so the top two sit in opposite halves.
 */
export function bracketPositions(n) {
  let order = [1]
  while (order.length < n) {
    const size = order.length * 2
    order = order.flatMap((s) => [s, size + 1 - s])
  }
  return order
}

/**
 * Where each drawn matchup sits in the bracket: draw-order indices, top to bottom, so adjacent
 * pairs meet in the next round. Seeded so that, if every higher seed wins, the best remaining seeds
 * always face the worst and 1 and 2 can only meet in the final:
 *   - Round of 18: the k-th best matchup meets the k-th worst — winner(1v36) v winner(18v19),
 *     2v35 v 17v20, … 9v28 v 10v27 — so chalk gives 1v18 … 9v10.
 *   - Those nine games are stacked in bracket order by their top seed, 1, 8, 4, 5 | 2, 7, 3, 6, then
 *     9 (the odd game out: nine winners, one dropped). Chalk then flows into quarterfinals 1v8, 4v5,
 *     2v7, 3v6 in the same order; the quarterfinals re-seed (see selectors/tournament), which in
 *     chalk gives exactly those.
 *
 * The draw itself is in draw order (the sheet, the check code, the stream all follow it); this is
 * only where the matchups go on the bracket. The CLI writes the opening round in this order, and
 * the bracket engine pairs adjacent winners.
 */
export function bracketSlots(result) {
  const seedOf = new Map(result.participants.map((p) => [p.ffuId, p.seed]))
  const better = (m) => Math.min(seedOf.get(m.a), seedOf.get(m.b))
  // ranked[s - 1] is the matchup whose better seed is s.
  const ranked = result.matchups.map((m, i) => ({ i, seed: better(m) })).sort((x, y) => x.seed - y.seed)
  const games = ranked.length / 2
  let tree = 1
  while (tree * 2 <= games) tree *= 2
  const tops = [...bracketPositions(tree), ...Array.from({ length: games - tree }, (_, k) => tree + 1 + k)]
  return tops.flatMap((s) => [ranked[s - 1].i, ranked[ranked.length - s].i])
}

/**
 * A short fingerprint of the drawn matchups (FNV-1a over them, as 8 hex digits, "XXXX-XXXX").
 * The page shows it when the draw ends and the sheet (so the CLI) prints it: matching codes are a
 * one-glance proof that the official file is the bracket the stream showed.
 */
export function drawCheckCode(result) {
  let h = 0x811c9dc5
  const text = result.matchups.map((m) => `${m.a}>${m.b}`).join('|')
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  const hex = (h >>> 0).toString(16).toUpperCase().padStart(8, '0')
  return `${hex.slice(0, 4)}-${hex.slice(4)}`
}

/**
 * Conducts the draw.
 *
 * @param {{PREMIER: Team[], MASTERS: Team[], NATIONAL: Team[]}} field — PREMIER and MASTERS must be
 *        in DRAFT ORDER (that sets both who draws first and their seeds). NATIONAL may come in any
 *        order: it is re-sorted here (see below). Team = { ffuId, name }
 * @param {string|number} seed — the publicly committed seed.
 * @returns {{participants, matchups, drawnOrder}} participants are seed-ordered (1 → 36).
 */
export function drawCup(field, seed) {
  validateField(field)
  const rng = makeRng(seed)

  const mastersPool = [...field.MASTERS]
  // National never draws, but its ORDER still matters: opponents are picked by position in the
  // pool, so two callers handing National over in different orders get different brackets from
  // the same seed. That happened (2026-09-29): the page sorted it by draft slot, the CLI kept
  // Sleeper's roster order, and they disagreed for every seed. Sorting by ffuId here, inside the
  // one implementation, means no caller can get it wrong again. (Masters keeps its draft order —
  // that order is a rule, and both callers already supply it.)
  const nationalPool = [...field.NATIONAL].sort(byFfuId)
  const drawnOrder = []

  const firstTies = premierDraws(field.PREMIER, mastersPool, nationalPool, rng, drawnOrder)
  // Whoever is left in the Masters pool draws; their draft order is preserved by the spread above.
  const remainingMasters = [...mastersPool]
  mastersPool.length = 0
  const secondTies = mastersDraws(remainingMasters, nationalPool, rng, drawnOrder)
  const matchups = [...firstTies, ...secondTies]

  const seedOf = new Map()
  field.PREMIER.forEach((t, i) => seedOf.set(t.ffuId, i + 1))
  remainingMasters.forEach((t, i) => seedOf.set(t.ffuId, 13 + i))
  // Reverse order of selection: first team drawn is the 36 seed.
  drawnOrder.forEach((t, i) => seedOf.set(t.ffuId, 36 - i))

  const tierOf = new Map()
  for (const tier of ['PREMIER', 'MASTERS', 'NATIONAL']) {
    for (const t of field[tier]) tierOf.set(t.ffuId, tier)
  }

  const participants = [...field.PREMIER, ...field.MASTERS, ...field.NATIONAL]
    .map((t) => ({ ffuId: t.ffuId, tier: tierOf.get(t.ffuId), seed: seedOf.get(t.ffuId) }))
    .sort((a, b) => a.seed - b.seed)

  verify(participants, matchups, tierOf)
  return { participants, matchups, drawnOrder }
}
