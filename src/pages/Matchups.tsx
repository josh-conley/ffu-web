import { useMemo, useState } from 'react'
import type { Game, ScheduledGame, SeasonData } from '@/data'
import { nameForYear } from '@/config'
import { useSeasonView } from '@/hooks/useSeasonView'
import { useUrlState } from '@/hooks/useUrlState'
import { useNflState } from '@/hooks/useNflState'
import { gamesByWeek, liveWeekFor, regularSeasonStandings, runningRecords, upcomingFixtures } from '@/selectors'
import { SeasonLeaguePicker } from '@/components/SeasonLeaguePicker'
import { FixtureCard, MatchupCard } from '@/components/MatchupCard'
import { LineupModal } from '@/components/LineupModal'
import { LiveLineupModal } from '@/components/LiveLineupModal'
import { recordLabel } from '@/components/format'
import { SELECT } from '@/components/controls'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

/** Weeks filtered to a single member's games (one card/week); empty weeks dropped. */
function weeksFor(weeks: ReturnType<typeof gamesByWeek>, member: string) {
  if (!member) return weeks
  return weeks
    .map((w) => ({ week: w.week, games: w.games.filter((g) => g.participants.some((p) => p.memberId === member)) }))
    .filter((w) => w.games.length > 0)
}

/** The same filter for weeks that haven't been played. */
function fixtureWeeksFor(weeks: ReturnType<typeof upcomingFixtures>, member: string) {
  if (!member) return weeks
  return weeks
    .map((w) => ({ week: w.week, fixtures: w.fixtures.filter((f) => f.memberIds.includes(member)) }))
    .filter((w) => w.fixtures.length > 0)
}

const WeekHeading = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-text">
    <span className="inline-block h-4 w-1 bg-accent" aria-hidden />
    {children}
  </h2>
)

/** Fixtures for the weeks still to come — shown so an in-progress season isn't a blank page. */
function UpcomingWeeks({
  weeks,
  year,
  liveWeek,
  onOpen,
  subtitle,
}: {
  weeks: ReturnType<typeof upcomingFixtures>
  year: string
  /** The week being played right now, if this is the live season — badged Live rather than Upcoming. */
  liveWeek?: number
  onOpen?: (fixture: ScheduledGame) => void
  subtitle?: (memberId: string) => string | undefined
}) {
  return (
    <>
      {weeks.map(({ week, fixtures }) => (
        <section key={`upcoming-${week}`}>
          <WeekHeading>
            Week {week}{' '}
            {week === liveWeek ? (
              <span className="text-[10px] font-semibold text-accent">Live</span>
            ) : (
              <span className="text-[10px] font-semibold text-muted">Upcoming</span>
            )}
          </WeekHeading>
          <div className="grid gap-3 sm:grid-cols-2">
            {fixtures.map((fixture, i) => (
              <FixtureCard
                key={`${week}-${i}`}
                fixture={fixture}
                year={year}
                subtitle={subtitle}
                onOpen={onOpen ? () => onOpen(fixture) : undefined}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  )
}

function MatchupsContent({ season, year, member, liveWeek }: { season: SeasonData; year: string; member: string; liveWeek?: number }) {
  const weeks = useMemo(() => gamesByWeek(season), [season])
  const shown = useMemo(() => weeksFor(weeks, member), [weeks, member])
  // A season being played has a published fixture list, so the weeks still to come are shown rather
  // than leaving the page empty until results exist.
  const upcoming = useMemo(() => fixtureWeeksFor(upcomingFixtures(season), member), [season, member])
  // Running record through each regular-season week + the regular-season seed for playoff cards.
  const records = useMemo(() => runningRecords(season), [season])
  const seeds = useMemo(() => new Map(regularSeasonStandings(season).map((r) => [r.team.memberId, r.rank])), [season])
  const [open, setOpen] = useState<Game | null>(null)
  const [openFixture, setOpenFixture] = useState<ScheduledGame | null>(null)
  // Lineups exist only for the Sleeper era; ESPN-era cards stay non-clickable.
  const hasLineups = season.era === 'sleeper'
  // Each team's record as it stands — the same number for every week still to come, since none of
  // them has been played. Shown on fixtures so an unplayed matchup still says who is having the
  // better season.
  const currentRecords = useMemo(() => new Map(season.teams.map((t) => [t.memberId, t.record])), [season])
  const fixtureSubtitle = (memberId: string) => {
    const record = currentRecords.get(memberId)
    return record ? recordLabel(record) : undefined
  }
  // A fixture has no stored lineups to read (nothing has been played), so its box score comes live
  // from Sleeper — that is only possible for a season still on Sleeper's books, which is exactly the
  // season that has unplayed weeks left.
  const liveLeagueId = season.era === 'sleeper' ? season.platformLeagueId : undefined

  const subtitleFor = (game: Game, memberId: string): string | undefined => {
    if (game.isPlayoff) {
      // ESPN-era (2018–2020) has no reliable playoff seed captured — show nothing there.
      if (season.era !== 'sleeper') return undefined
      const seed = seeds.get(memberId)
      return seed ? `#${seed}` : undefined
    }
    const r = records.get(memberId)?.get(game.week)
    if (!r) return undefined
    return r.ties > 0 ? `${r.wins}-${r.losses}-${r.ties}` : `${r.wins}-${r.losses}`
  }

  if (shown.length === 0 && upcoming.length === 0) return <p className="text-muted">No matchups for this member.</p>
  return (
    <div className="space-y-8">
      {shown.map(({ week, games }) => (
        <section key={week}>
          <WeekHeading>Week {week}</WeekHeading>
          <div className="grid gap-3 sm:grid-cols-2">
            {games.map((game, i) => (
              <MatchupCard key={`${week}-${i}`} game={game} year={year} onOpen={hasLineups ? () => setOpen(game) : undefined} subtitle={(mid) => subtitleFor(game, mid)} />
            ))}
          </div>
        </section>
      ))}
      <UpcomingWeeks
        weeks={upcoming}
        year={year}
        liveWeek={liveWeek}
        subtitle={fixtureSubtitle}
        onOpen={liveLeagueId ? setOpenFixture : undefined}
      />
      {open && <LineupModal tier={season.tier} year={year} game={open} onClose={() => setOpen(null)} />}
      {openFixture && liveLeagueId && (
        <LiveLineupModal
          leagueId={liveLeagueId}
          year={year}
          week={openFixture.week}
          memberIds={openFixture.memberIds as [string, string]}
          onClose={() => setOpenFixture(null)}
        />
      )}
    </div>
  )
}

export function Matchups() {
  const { years, year, tier, setYear, setTier, season, loading, error } = useSeasonView()
  const [member, setMember] = useUrlState('member', '')
  // Sleeper's clock, so the week actually being played reads Live rather than Upcoming. Only asked
  // for when the season on screen could be the live one; an archive year never pays for the call.
  const nflState = useNflState(season?.era === 'sleeper')
  const liveWeek = liveWeekFor(year, nflState.data)

  // Members of the SELECTED season only, by their name that year. Selecting one filters the games.
  const memberOptions = useMemo(
    () =>
      (season?.teams ?? [])
        .map((t) => ({ value: t.memberId, label: nameForYear(t.memberId, year) ?? t.memberId }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [season, year],
  )
  // Ignore a stale member param that isn't in the current season (e.g. after switching year/tier).
  const activeMember = memberOptions.some((o) => o.value === member) ? member : ''

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">Matchups</h1>
        {years.length > 0 && (
          <SeasonLeaguePicker years={years} year={year} tier={tier} onYear={setYear} onTier={setTier} />
        )}
      </div>
      {memberOptions.length > 0 && (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Member</span>
          <select className={`${SELECT} w-full sm:w-56`} value={activeMember} onChange={(e) => setMember(e.target.value)} aria-label="Member">
            <option value="">All members</option>
            {memberOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      )}
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage error={error} />}
      {season && <MatchupsContent season={season} year={year} member={activeMember} liveWeek={liveWeek} />}
    </div>
  )
}
