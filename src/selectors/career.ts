import type { LeagueRosterSummary, SeasonData, SeasonTeam } from '@/data'
import type { Tier } from '@/config/types'
import { divisionWinnerIds, winPct } from './standings'
import { hasBeenPlayed, seasonHighLow } from './games'
import { seasonUpr } from './upr'

// Career aggregates per member across seasons (Members career view + All-Time Stats). Sums the
// STORED Sleeper record/points (consistent with season display) and counts placements. The
// regular-season seed is never involved here.

const TIER_ORDER: Tier[] = ['PREMIER', 'MASTERS', 'NATIONAL']

// Old site's fixed placement→playoff-record map (top-6 bracket). Placements outside 1–6 → 0-0.
const PLAYOFF_RECORD: Record<number, { wins: number; losses: number }> = {
  1: { wins: 2, losses: 0 },
  2: { wins: 2, losses: 1 },
  3: { wins: 1, losses: 2 },
  4: { wins: 1, losses: 2 },
  5: { wins: 0, losses: 1 },
  6: { wins: 0, losses: 1 },
}

export interface SeasonFinish {
  year: string
  tier: Tier
  finalPlacement: number | null
  /** Teams in that tier-season — lets a view flag a last-place finish with its tier/year. */
  seasonSize: number
  /** Won their division that season (regular-season record) — a "pennant". */
  wonDivision: boolean
}

export interface CareerStats {
  memberId: string
  seasons: number
  wins: number
  losses: number
  ties: number
  pointsFor: number
  pointsAgainst: number
  winPct: number
  championships: number // finalPlacement === 1
  runnerUps: number // finalPlacement === 2
  thirdPlaceFinishes: number // finalPlacement === 3
  lastPlaceFinishes: number // finalPlacement === season size (came in last)
  /** Playoff W-L by the old site's placement→record map (1→2-0, 2→2-1, 3/4→1-2, 5/6→0-1). */
  playoffWins: number
  playoffLosses: number
  playoffAppearances: number // reached the championship bracket
  /** Tier of each playoff (championship-bracket) appearance — for the by-league breakdown. */
  playoffTiers: Tier[]
  /** Best (lowest) / worst single-game score across ALL games (incl. playoffs). */
  careerHighGame: number | null
  careerLowGame: number | null
  /** Seasons played in each tier (the "Tiers" column). */
  premierSeasons: number
  mastersSeasons: number
  nationalSeasons: number
  /** Average final placement over completed seasons (lower = better). */
  averageSeasonRank: number | null
  bestFinish: number | null
  /** First / most-recent season the member played (their true FFU debut + latest year). */
  firstYear: number | null
  lastYear: number | null
  /** Played the most recent season in the data (derived; replaces the unreliable config flag). */
  isActive: boolean
  finishes: SeasonFinish[]
}

export interface TitleWin {
  year: string
  tier: Tier
}

/** A member's championships (Premier → Masters → National, then by year) — one per title won. */
export function championshipTitles(c: CareerStats): TitleWin[] {
  return c.finishes
    .filter((f) => f.finalPlacement === 1)
    .map((f) => ({ year: f.year, tier: f.tier }))
    .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || a.year.localeCompare(b.year))
}

/** Set of "year|tier" each member reached the championship bracket (vs consolation). */
function championshipBracketSeasons(seasons: SeasonData[]): Map<string, Set<string>> {
  const byMember = new Map<string, Set<string>>()
  for (const season of seasons) {
    for (const game of season.games) {
      if (game.bracket !== 'championship') continue
      for (const p of game.participants) {
        let set = byMember.get(p.memberId)
        if (set === undefined) {
          set = new Set()
          byMember.set(p.memberId, set)
        }
        set.add(`${season.year}|${season.tier}`)
      }
    }
  }
  return byMember
}

function emptyCareer(memberId: string): CareerStats {
  return {
    memberId,
    seasons: 0,
    wins: 0,
    losses: 0,
    ties: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    winPct: 0,
    championships: 0,
    runnerUps: 0,
    thirdPlaceFinishes: 0,
    lastPlaceFinishes: 0,
    playoffWins: 0,
    playoffLosses: 0,
    playoffAppearances: 0,
    playoffTiers: [],
    careerHighGame: null,
    careerLowGame: null,
    premierSeasons: 0,
    mastersSeasons: 0,
    nationalSeasons: 0,
    averageSeasonRank: null,
    bestFinish: null,
    firstYear: null,
    lastYear: null,
    isActive: false,
    finishes: [],
  }
}

export function careerStats(seasons: SeasonData[]): Map<string, CareerStats> {
  const playoffSeasons = championshipBracketSeasons(seasons)
  const career = new Map<string, CareerStats>()

  for (const season of seasons) {
    // A season's file exists from the day its leagues do (teams and divisions are known months
    // before week 1), so skip one that hasn't been played: entering a league is not a season in
    // anyone's career record, and counting it would add a season, a tier-season and a 0-0 row to
    // all 36 members every September. It starts counting the week it has games.
    if (!hasBeenPlayed(season)) continue
    const highLow = seasonHighLow(season)
    const pennants = divisionWinnerIds(season)
    for (const t of season.teams) {
      let c = career.get(t.memberId)
      if (c === undefined) {
        c = emptyCareer(t.memberId)
        career.set(t.memberId, c)
      }
      accumulateSeason(c, season, t, highLow.get(t.memberId), pennants.has(t.memberId))
    }
  }

  // The latest year PLAYED, not merely present: an unplayed season's file would otherwise make
  // `isActive` (lastYear === latestYear) false for everyone the moment it lands.
  const latestYear = Math.max(0, ...seasons.filter(hasBeenPlayed).map((s) => Number(s.year)))
  for (const [memberId, c] of career) {
    finalizeCareer(c, playoffSeasons.get(memberId), latestYear)
  }

  return career
}

const TIER_FIELD = {
  PREMIER: 'premierSeasons',
  MASTERS: 'mastersSeasons',
  NATIONAL: 'nationalSeasons',
} as const

/** Fold one team's season into its running career totals. */
function accumulateSeason(
  c: CareerStats,
  season: SeasonData,
  t: SeasonTeam,
  highLow: { high: number; low: number } | undefined,
  wonDivision: boolean,
): void {
  c.seasons += 1
  c.wins += t.record.wins
  c.losses += t.record.losses
  c.ties += t.record.ties
  c.pointsFor += t.points.for
  c.pointsAgainst += t.points.against
  c[TIER_FIELD[season.tier]] += 1
  const place = t.finalPlacement
  if (place === 1) c.championships += 1
  else if (place === 2) c.runnerUps += 1
  else if (place === 3) c.thirdPlaceFinishes += 1
  if (place !== undefined && place === season.teams.length) c.lastPlaceFinishes += 1
  const playoff = place !== undefined ? PLAYOFF_RECORD[place] : undefined
  if (playoff) {
    c.playoffWins += playoff.wins
    c.playoffLosses += playoff.losses
  }
  if (highLow) {
    c.careerHighGame = c.careerHighGame === null ? highLow.high : Math.max(c.careerHighGame, highLow.high)
    c.careerLowGame = c.careerLowGame === null ? highLow.low : Math.min(c.careerLowGame, highLow.low)
  }
  c.finishes.push({ year: season.year, tier: season.tier, finalPlacement: place ?? null, seasonSize: season.teams.length, wonDivision })
}

/** Fill the derived fields once a member's per-season totals are accumulated. */
function finalizeCareer(c: CareerStats, playoffSet: Set<string> | undefined, latestYear: number): void {
  c.winPct = winPct({ wins: c.wins, losses: c.losses, ties: c.ties })
  const playoffTiers: Tier[] = []
  if (playoffSet) {
    for (const key of playoffSet) {
      const tier = key.split('|')[1] // key is `${year}|${tier}`
      if (tier) playoffTiers.push(tier as Tier)
    }
  }
  playoffTiers.sort((a, b) => TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b))
  c.playoffAppearances = playoffTiers.length
  c.playoffTiers = playoffTiers
  const placements = c.finishes.map((f) => f.finalPlacement).filter((n): n is number => n !== null)
  c.bestFinish = placements.length > 0 ? Math.min(...placements) : null
  c.averageSeasonRank =
    placements.length > 0 ? placements.reduce((sum, p) => sum + p, 0) / placements.length : null
  const yearsPlayed = c.finishes.map((f) => Number(f.year))
  c.firstYear = yearsPlayed.length > 0 ? Math.min(...yearsPlayed) : null
  c.lastYear = yearsPlayed.length > 0 ? Math.max(...yearsPlayed) : null
  c.isActive = c.lastYear === latestYear
}

export function careerFor(seasons: SeasonData[], memberId: string): CareerStats | undefined {
  return careerStats(seasons).get(memberId)
}

/** The league an active member is in this (latest) season — undefined for past members. */
export function currentLeague(c: CareerStats): Tier | undefined {
  if (!c.isActive || c.lastYear === null) return undefined
  return c.finishes.find((f) => Number(f.year) === c.lastYear)?.tier
}

/**
 * Career UPR per member: the MEAN of a member's per-season UPRs (each season computed over its
 * own regular-season games — its own high/low). Matches the old site's "Avg UPR". Chosen over a
 * single pooled-career UPR because the formula weights (high+low) for a ~14-game season; pooling a
 * whole career turns high/low into career-long single-game extremes that distort the metric.
 */
export function careerUpr(seasons: SeasonData[]): Map<string, number> {
  const perSeason = new Map<string, number[]>()
  for (const season of seasons) {
    for (const [id, u] of seasonUpr(season)) {
      const list = perSeason.get(id) ?? []
      list.push(u)
      perSeason.set(id, list)
    }
  }

  const upr = new Map<string, number>()
  for (const [id, list] of perSeason) {
    if (list.length === 0) continue
    upr.set(id, list.reduce((sum, u) => sum + u, 0) / list.length)
  }
  return upr
}

export interface MemberSeason {
  year: string
  tier: Tier
  team: SeasonTeam
}

/** A member's per-season rows (record/points/finish), chronological — for the Members detail view. */
export function memberSeasons(seasons: SeasonData[], memberId: string): MemberSeason[] {
  const rows: MemberSeason[] = []
  for (const season of seasons) {
    const team = season.teams.find((t) => t.memberId === memberId)
    if (team !== undefined) rows.push({ year: season.year, tier: season.tier, team })
  }
  return rows.sort((a, b) => Number(a.year) - Number(b.year))
}

export interface LeagueRoster {
  tier: Tier
  members: CareerStats[]
}
export interface MembersByLeague {
  /** Active members grouped by the league they're in this (latest) season, in tier order. */
  current: LeagueRoster[]
  /** Everyone who has played but isn't in the latest season. */
  past: CareerStats[]
}

/**
 * Every member the directory shows, by id. Built from the GROUPS rather than from `careerStats` so
 * the two can't disagree: a member in their first season has no career row yet, but is on a roster
 * and so must still be openable from the directory.
 */
export function membersById(groups: MembersByLeague): Map<string, CareerStats> {
  const byId = new Map<string, CareerStats>()
  for (const group of groups.current) for (const c of group.members) byId.set(c.memberId, c)
  for (const c of groups.past) byId.set(c.memberId, c)
  return byId
}

/**
 * Grouping straight off the CURRENT season's rosters. Who is in which league is a fact about
 * signups, not about games: the commissioner sets the leagues up on Sleeper months before week 1,
 * so promotions, relegations, new members and departures are all knowable long before anything is
 * played. Reading them here is what keeps the directory honest all preseason and all season.
 */
function byCurrentRosters(careers: Map<string, CareerStats>, rosters: LeagueRosterSummary[]): MembersByLeague {
  const signedUp = new Set(rosters.flatMap((r) => r.memberIds))
  const current = TIER_ORDER.flatMap((tier) => {
    const roster = rosters.find((r) => r.tier === tier)
    // A first-time member has no completed season and so no CareerStats. An empty career puts them
    // in the directory the day they sign up instead of after their first backfill.
    return roster ? [{ tier, members: roster.memberIds.map((id) => careers.get(id) ?? emptyCareer(id)) }] : []
  })
  return { current, past: [...careers.values()].filter((c) => !signedUp.has(c.memberId)) }
}

/**
 * Roster for the Members directory: members bucketed by the league they're in, plus a past-members
 * list. Grouping only — display ordering and names are a view concern.
 *
 * `currentRosters` (live from Sleeper, via useLeagueRosters) is the authority when present. Without
 * it the grouping falls back to each member's finish in the latest COMPLETED season, which is
 * correct in the offseason but goes stale the moment the next season's leagues are set — everyone
 * shown in the tier they just left. The fallback also covers the case where Sleeper is unreachable.
 */
export function membersByLeague(seasons: SeasonData[], currentRosters: LeagueRosterSummary[] = []): MembersByLeague {
  const careers = careerStats(seasons)
  if (currentRosters.length > 0) return byCurrentRosters(careers, currentRosters)

  const byTier = new Map<Tier, CareerStats[]>()
  const past: CareerStats[] = []
  for (const c of careers.values()) {
    const currentTier = currentLeague(c)
    if (currentTier) {
      const bucket = byTier.get(currentTier) ?? []
      bucket.push(c)
      byTier.set(currentTier, bucket)
    } else {
      past.push(c)
    }
  }
  const current = TIER_ORDER.flatMap((tier) => {
    const members = byTier.get(tier)
    return members ? [{ tier, members }] : []
  })
  return { current, past }
}
