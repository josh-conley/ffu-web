// The FFU Cup — the RULES of the competition, as adopted by the commissioner's amendment.
//
// What lives here vs. in data: this file holds what is true of the Cup in every season (its name,
// the size of the field, how a round advances, what the winner takes home). What varies season to
// season — which NFL weeks the rounds are played on, and who drew whom — is DATA, and lives in
// public/data/{year}/tournament.json. The amendment is explicit that "FFU Cup Timing is variable
// each season, considering NFL bye week impacts and the FFU calendar", which is exactly why the
// weeks are not constants here.

/** Round keys, in bracket order. Stable ids shared with the per-year tournament.json rounds. */
export const CUP_ROUND_KEYS = ['r36', 'r18', 'r8', 'r4', 'final'] as const
export type CupRoundKey = (typeof CUP_ROUND_KEYS)[number]

export const CUP_NAME = 'FFU Cup'

/** First season the Cup was contested. The page calls itself "inaugural" while CUP_YEAR matches. */
export const CUP_INAUGURAL_YEAR = '2026'

/** The season the Cup page shows. One knob — bump it when the Cup moves forward a year. */
export const CUP_YEAR: string = '2025' // DEMO BUILD: last season's real weeks score the leaderboard

/** Every team in all three tiers enters: 12 Premier + 12 Masters + 12 National. */
export const CUP_FIELD_SIZE = 36

/**
 * Cup accent — a one-off event color, deliberately NOT a tier color, so it stays here rather than
 * in components/leagues.ts (which is only ever Premier/Masters/National).
 */
export const CUP_ACCENT = '#2596be'

/** Verbatim from the amendment — the blue Discord role the winner receives. */
export const CUP_DISCORD_ROLE = 'FA Cup Winner'

/** What it takes to survive each round, keyed by round key (amendment: "Round Descriptions"). */
export const CUP_ROUND_RULES: Record<CupRoundKey, string> = {
  r36: 'All 36 teams compete. Winners advance and are awarded prizing.',
  r18: 'Winners advance and are awarded prizing — except the lowest-scoring winner of the round, who is eliminated alongside the losers.',
  r8: 'The eight teams left are re-seeded by their draw seed, best against worst (1v8, 4v5, 2v7, 3v6), so the two highest seeds remaining can only meet in the final. Winners advance and are awarded prizing.',
  r4: 'Winners advance and are awarded prizing.',
  final: 'The winner is awarded prizing, the blue Discord role, and a diamond in the trophy case.',
}

/** Narrows a round key coming from per-season data to one the rules know about. */
export const isCupRoundKey = (key: string): key is CupRoundKey => key in CUP_ROUND_RULES

/**
 * Pick'em points for each correct pick, by round: doubling, so every round is worth the same in
 * total (18×1, 9×2, 4×4, 2×8, 1×16) and the champion pick alone matches a whole Round of 36. Josh's
 * call (2026-10-13). The drop pick (which Round of 18 winner is culled) earns nothing on its own —
 * it only shapes the member's quarterfinals.
 */
export const CUP_PICKEM_POINTS: Record<CupRoundKey, number> = { r36: 1, r18: 2, r8: 4, r4: 8, final: 16 }

/**
 * Where the pick'em Worker (workers/pickem) answers. Empty = no pick'em API, so the tab never
 * shows. Set once the Worker has its first deploy (its workers.dev URL is in that run's summary).
 */
export const CUP_PICKEM_API: string = 'demo' // DEMO BUILD: the API is mocked in data/pickemApi.ts
