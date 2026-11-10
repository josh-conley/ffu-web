import type { ThemeId } from './registry'

// Holiday skins that the site wears by default for one week of games each.
//
// A "week" here is the league's, not the calendar's: it runs Wednesday to Tuesday. The games are
// Thursday to Monday, and Tuesday is when the week is wrapped up (scores settle, the newsletter
// goes out), so the skin stays on through that Tuesday and comes off on Wednesday.
//
// Dates are the visitor's local ones: the point is what day it feels like where they are.

export interface HolidayWeek {
  id: ThemeId
  /** Names this one occurrence (e.g. `thanksgiving-2026`), so opting out lasts exactly one week. */
  key: string
}

interface Holiday {
  id: ThemeId
  /** The holiday's date in a given year. */
  date: (year: number) => Date
}

const WEDNESDAY = 3

/** US Thanksgiving: the fourth Thursday of November. */
function thanksgiving(year: number): Date {
  const firstOfMonth = new Date(year, 10, 1).getDay()
  const firstThursday = 1 + ((4 - firstOfMonth + 7) % 7)
  return new Date(year, 10, firstThursday + 21)
}

const HOLIDAYS: readonly Holiday[] = [
  { id: 'thanksgiving', date: thanksgiving },
  { id: 'christmas', date: (year) => new Date(year, 11, 25) },
]

/** The Wednesday-to-Tuesday week containing `day`, as [start, end) at local midnight. */
function leagueWeek(day: Date): [Date, Date] {
  const back = (day.getDay() - WEDNESDAY + 7) % 7
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate() - back)
  const end = new Date(day.getFullYear(), day.getMonth(), day.getDate() - back + 7)
  return [start, end]
}

/** The holiday week `now` falls in, if any. Neither week can cross into another year. */
export function holidayWeek(now: Date): HolidayWeek | null {
  const year = now.getFullYear()
  for (const holiday of HOLIDAYS) {
    const [start, end] = leagueWeek(holiday.date(year))
    if (now >= start && now < end) return { id: holiday.id, key: `${holiday.id}-${year}` }
  }
  return null
}
