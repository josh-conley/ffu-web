import type { Game, SeasonData } from '@/data'
import type { Tier } from '@/config/types'

// The Lineal FFU Championship — a boxing-style "belt" lineage. It originates with the league's
// FIRST champion (the top flight's title winner in the earliest season) and thereafter passes to
// whoever BEATS the holder. Every game counts as a title defense: regular season, playoff, even a
// Toilet Bowl game — if the belt-holder loses, the belt changes hands that week. A tie retains it
// (boxing: the champion keeps the belt on a draw). The belt follows the holder wherever they play,
// so a relegated champion would carry it down a tier.
//
// All of this is DERIVED from games — nothing about the lineage is stored (Charter §"derive
// opinions"). The origin is derived too, not hardcoded: whoever won the first top-flight title.

/** The lineage starts in the top flight — its first champion is the Original FFU Champion. */
const ORIGIN_TIER: Tier = 'PREMIER'

/** A point in league time — one team's game slot. */
export interface LinealMoment {
  year: string
  tier: Tier
  week: number
  isPlayoff: boolean
  round?: string
}

/** The score line of the game a reign began with, from the new champion's side. */
export interface LinealBout {
  opponentId: string
  score: number
  opponentScore: number
}

/** One game contested while the belt was on the line. */
export interface LinealTitleGame extends LinealMoment {
  championId: string
  challengerId: string
  championScore: number
  challengerScore: number
  outcome: 'defended' | 'drawn' | 'lost'
}

export interface LinealReign {
  /** 1-based position in the lineage. */
  order: number
  championId: string
  /** Whose belt they took; null for the original champion, who created it by winning the title. */
  wonFrom: string | null
  wonAt: LinealMoment
  /** The win that started the reign (for the original champion, the first title game itself). */
  wonBout: LinealBout
  lostAt: LinealMoment | null
  lostTo: string | null
  /** Title games survived — wins plus draws. */
  defenses: number
  titleGames: LinealTitleGame[]
  /**
   * League weeks elapsed while holding it — counted over the league's own week slots (every
   * distinct year+week in the data), not the calendar, which the data doesn't carry. Weeks the
   * holder sat out count (playoff byes, eliminations, a whole season away); an offseason is a
   * single gap between slots, so this measures football weeks held, not real time.
   */
  weeksHeld: number
  /** Still holding it at the end of the available data. */
  current: boolean
}

export interface LinealHistory {
  reigns: LinealReign[]
  currentChampionId: string | null
  /** The title game that started the lineage. */
  origin: LinealMoment | null
}

interface DatedGame extends Game {
  year: string
  tier: Tier
}

/** Every game across every season in league-time order (year, then week). */
function chronological(seasons: SeasonData[]): DatedGame[] {
  const games = seasons.flatMap((s) => s.games.map((g) => ({ ...g, year: s.year, tier: s.tier })))
  return games.sort((a, b) => a.year.localeCompare(b.year) || a.week - b.week)
}

/** Ordered `year|week` slots → index, so a reign's length can be measured in league weeks. */
function weekSlots(games: DatedGame[]): Map<string, number> {
  const keys = [...new Set(games.map((g) => `${g.year}|${g.week}`))]
  return new Map(keys.map((key, i) => [key, i]))
}

const momentOf = (g: DatedGame): LinealMoment => ({
  year: g.year,
  tier: g.tier,
  week: g.week,
  isPlayoff: g.isPlayoff,
  round: g.round,
})

/**
 * The first title ever won: the earliest season of the origin tier, its `finalPlacement === 1`
 * team, and the championship game they won it in.
 */
function findOrigin(seasons: SeasonData[], games: DatedGame[]): { championId: string; at: LinealMoment; bout: LinealBout } | null {
  const first = seasons
    .filter((s) => s.tier === ORIGIN_TIER)
    .sort((a, b) => a.year.localeCompare(b.year))[0]
  const championId = first?.teams.find((t) => t.finalPlacement === 1)?.memberId
  if (first === undefined || championId === undefined) return null

  // The title game itself; fall back to their last game of that season if the round isn't labelled.
  const theirs = games.filter(
    (g) => g.year === first.year && g.tier === first.tier && g.participants.some((p) => p.memberId === championId),
  )
  const titleGame = theirs.filter((g) => g.bracket === 'championship' && g.round === 'Championship').at(-1) ?? theirs.at(-1)
  const champ = titleGame?.participants.find((p) => p.memberId === championId)
  const opponent = titleGame?.participants.find((p) => p.memberId !== championId)
  if (titleGame === undefined || champ === undefined || opponent === undefined) return null

  const bout = { opponentId: opponent.memberId, score: champ.score, opponentScore: opponent.score }
  return { championId, at: momentOf(titleGame), bout }
}

function newReign(order: number, championId: string, wonFrom: string | null, wonAt: LinealMoment, wonBout: LinealBout): LinealReign {
  return { order, championId, wonFrom, wonAt, wonBout, lostAt: null, lostTo: null, defenses: 0, titleGames: [], weeksHeld: 0, current: true }
}

/** Is this game after the moment the belt came into existence? (The origin game itself isn't a defense.) */
function isAfter(game: DatedGame, at: LinealMoment): boolean {
  return game.year > at.year || (game.year === at.year && game.week > at.week)
}

/**
 * Walk the league in chronological order, passing the belt to anyone who beats its holder.
 * The holder plays at most one game per week, so the order of a week's other games never matters.
 */
export function linealHistory(seasons: SeasonData[]): LinealHistory {
  const games = chronological(seasons)
  const origin = findOrigin(seasons, games)
  if (origin === null) return { reigns: [], currentChampionId: null, origin: null }

  const reigns: LinealReign[] = [newReign(1, origin.championId, null, origin.at, origin.bout)]
  let holder = origin.championId

  for (const game of games) {
    if (!isAfter(game, origin.at)) continue
    const champ = game.participants.find((p) => p.memberId === holder)
    const challenger = game.participants.find((p) => p.memberId !== holder)
    if (champ === undefined || challenger === undefined) continue

    const outcome = challenger.score > champ.score ? 'lost' : challenger.score === champ.score ? 'drawn' : 'defended'
    const reign = reigns[reigns.length - 1]!
    reign.titleGames.push({
      ...momentOf(game),
      championId: holder,
      challengerId: challenger.memberId,
      championScore: champ.score,
      challengerScore: challenger.score,
      outcome,
    })

    if (outcome === 'lost') {
      reign.lostAt = momentOf(game)
      reign.lostTo = challenger.memberId
      reign.current = false
      holder = challenger.memberId
      const bout = { opponentId: reign.championId, score: challenger.score, opponentScore: champ.score }
      reigns.push(newReign(reigns.length + 1, holder, reign.championId, momentOf(game), bout))
    } else {
      reign.defenses += 1
    }
  }

  applyWeeksHeld(reigns, weekSlots(games))
  return { reigns, currentChampionId: holder, origin: origin.at }
}

function applyWeeksHeld(reigns: LinealReign[], slots: Map<string, number>): void {
  const last = slots.size - 1
  for (const reign of reigns) {
    const from = slots.get(`${reign.wonAt.year}|${reign.wonAt.week}`) ?? 0
    const to = reign.lostAt === null ? last : (slots.get(`${reign.lostAt.year}|${reign.lostAt.week}`) ?? from)
    reign.weeksHeld = Math.max(0, to - from)
  }
}

export interface LinealHolderTotal {
  memberId: string
  reigns: number
  defenses: number
  weeksHeld: number
  /** Longest single reign, in league weeks. */
  longestReign: number
  /** The year+week they first took it (for a stable "who got there first" ordering). */
  firstWon: LinealMoment
  current: boolean
}

/** Per-member lineage totals (a member can hold the belt on several separate occasions). */
export function linealHolderTotals(reigns: LinealReign[]): LinealHolderTotal[] {
  const totals = new Map<string, LinealHolderTotal>()
  for (const reign of reigns) {
    const existing = totals.get(reign.championId)
    if (existing === undefined) {
      totals.set(reign.championId, {
        memberId: reign.championId,
        reigns: 1,
        defenses: reign.defenses,
        weeksHeld: reign.weeksHeld,
        longestReign: reign.weeksHeld,
        firstWon: reign.wonAt,
        current: reign.current,
      })
    } else {
      existing.reigns += 1
      existing.defenses += reign.defenses
      existing.weeksHeld += reign.weeksHeld
      existing.longestReign = Math.max(existing.longestReign, reign.weeksHeld)
      existing.current = existing.current || reign.current
    }
  }
  return [...totals.values()].sort((a, b) => b.weeksHeld - a.weeksHeld || b.defenses - a.defenses)
}
