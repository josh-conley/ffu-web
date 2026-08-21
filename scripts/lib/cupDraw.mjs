// The FFU Cup draw — pure and deterministic. Given the three leagues' fields and a seed, it always
// produces the same bracket, which is the whole point: the commissioner publishes the seed BEFORE
// the draw (a number nobody controls, e.g. the combined final score of an announced NFL game), runs
// this, and anyone can re-run the same command and get a byte-identical result. A draw nobody can
// re-check is a bad property for a competition that pays out.
//
// Rules implemented (commissioner's amendment + the 2026-08-20 clarification):
//   1. Premier draws in draft order 1→12, each from ONE pool of all 24 Masters + National teams.
//   2. Once six teams from a league have been drawn, the pool narrows to the other league — so the
//      round opens with exactly six Premier–Masters and six Premier–National ties.
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
 * Returns the ties made and mutates the two pools.
 */
function premierDraws(premier, mastersPool, nationalPool, rng, drawnOrder) {
  const ties = []
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
    ties.push({ a: team.ffuId, b: opponent.ffuId })
  }
  return ties
}

/** Phase 2 — the undrawn Masters teams, in draft order, draw the remaining National teams. */
function mastersDraws(remainingMasters, nationalPool, rng, drawnOrder) {
  const ties = []
  for (const team of remainingMasters) {
    const opponent = takeRandom(nationalPool, rng)
    drawnOrder.push(opponent)
    ties.push({ a: team.ffuId, b: opponent.ffuId })
  }
  return ties
}

/** Post-conditions the amendment guarantees. A violation is a bug, not a bad draw — refuse to emit. */
function verify(participants, matchups, tierOf) {
  assert(participants.length === 36, `expected 36 participants, got ${participants.length}`)
  const seeds = participants.map((p) => p.seed).sort((a, b) => a - b)
  assert(seeds.every((s, i) => s === i + 1), 'seeds are not exactly 1–36')
  assert(matchups.length === 18, `expected 18 opening ties, got ${matchups.length}`)
  const pairing = (m) => [tierOf.get(m.a), tierOf.get(m.b)].sort().join('-')
  const counts = {}
  for (const m of matchups) {
    assert(tierOf.get(m.a) !== tierOf.get(m.b), `intra-league tie: ${m.a} vs ${m.b}`)
    counts[pairing(m)] = (counts[pairing(m)] ?? 0) + 1
  }
  assert(counts['MASTERS-PREMIER'] === 6, `expected 6 Premier–Masters ties, got ${counts['MASTERS-PREMIER'] ?? 0}`)
  assert(counts['NATIONAL-PREMIER'] === 6, `expected 6 Premier–National ties, got ${counts['NATIONAL-PREMIER'] ?? 0}`)
  assert(counts['MASTERS-NATIONAL'] === 6, `expected 6 Masters–National ties, got ${counts['MASTERS-NATIONAL'] ?? 0}`)
}

/**
 * Conducts the draw.
 *
 * @param {{PREMIER: Team[], MASTERS: Team[], NATIONAL: Team[]}} field — PREMIER and MASTERS must be
 *        in DRAFT ORDER (that sets both who draws first and their seeds). NATIONAL's order is
 *        irrelevant: National teams never draw, they are only ever drawn.
 *        Team = { ffuId, name }
 * @param {string|number} seed — the publicly committed seed.
 * @returns {{participants, matchups, drawnOrder}} participants are seed-ordered (1 → 36).
 */
export function drawCup(field, seed) {
  validateField(field)
  const rng = makeRng(seed)

  const mastersPool = [...field.MASTERS]
  const nationalPool = [...field.NATIONAL]
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
