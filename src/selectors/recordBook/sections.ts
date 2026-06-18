// The FFU Record Book layout — sections and their categories, mirroring records-v2-template.csv.
// This is the SPEC (labels + order + footnotes); the values are DERIVED in ./index.ts, never stored
// (Charter). A category renders blank until its computation lands, so the book is complete in
// structure and grows in coverage. Category `id`s are the contract between this layout and the
// computed entries — index.test.ts asserts every computed id exists here.

export interface RecordCategory {
  id: string
  label: string
  /** Optional caveat shown under the label (e.g. how a metric is defined). */
  note?: string
}

export interface RecordSection {
  title: string
  /** Sub-groups within a section (e.g. "Margin of Victory" vs "Team Points, Most"). */
  groups: { heading?: string; categories: RecordCategory[] }[]
}

export const RECORD_BOOK_SECTIONS: RecordSection[] = [
  {
    title: 'Regular Season',
    groups: [
      {
        heading: 'Wins',
        categories: [
          { id: 'rs-most-wins-reg', label: 'Most Wins, Single Season' },
          { id: 'rs-most-wins-reg-playoff', label: 'Most Wins, Season + Playoffs' },
          { id: 'rs-best-winpct-reg', label: 'Best Win %, Single Season' },
          { id: 'rs-best-winpct-reg-playoff', label: 'Best Win %, Season + Playoffs' },
          { id: 'rs-most-wins-career', label: 'Most Wins, Career' },
          { id: 'rs-most-winning-seasons', label: 'Most Winning Seasons' },
          { id: 'rs-longest-win-streak', label: 'Longest Winning Streak' },
          { id: 'rs-longest-win-streak-start', label: 'Longest Winning Streak to Begin a Season' },
          { id: 'rs-fastest-100-wins', label: 'Fastest to 100 Wins', note: 'fewest games' },
        ],
      },
      {
        heading: 'Losses',
        categories: [
          { id: 'rs-most-losses-season', label: 'Most Losses, Single Season' },
          { id: 'rs-longest-lose-streak-start', label: 'Longest Losing Streak to Begin a Season' },
          { id: 'rs-longest-lose-streak', label: 'Longest Losing Streak' },
          { id: 'rs-least-losses-reg-playoff', label: 'Fewest Losses, Season + Playoffs' },
          { id: 'rs-most-losses-career', label: 'Most Losses, Career' },
          { id: 'rs-fastest-100-losses', label: 'Fastest to 100 Losses', note: 'fewest games' },
        ],
      },
    ],
  },
  {
    title: 'Playoffs',
    groups: [
      {
        categories: [
          { id: 'po-most-appearances', label: 'Most Playoff Appearances' },
          { id: 'po-most-games', label: 'Most Playoff Games' },
          { id: 'po-most-byes', label: 'Most First-Round Byes' },
          { id: 'po-most-consec-byes', label: 'Most Consecutive First-Round Byes' },
          { id: 'po-most-consec-appearances', label: 'Most Consecutive Playoff Appearances' },
          { id: 'po-active-appearance-streak', label: 'Longest Active Appearance Streak' },
          { id: 'po-most-consec-missed', label: 'Most Consecutive Seasons Missing Playoffs' },
          { id: 'po-active-missed-streak', label: 'Longest Active Streak Missing Playoffs' },
        ],
      },
      {
        heading: 'Against the odds',
        categories: [
          { id: 'po-lose-streak-make-playoffs', label: 'Longest 0-X Start, Still Made Playoffs' },
          { id: 'po-lose-streak-make-champ', label: 'Longest 0-X Start, Still Made the Final' },
          { id: 'po-wins-start-miss-playoffs', label: 'Best Start, Still Missed Playoffs' },
        ],
      },
    ],
  },
  {
    title: 'Championships',
    groups: [
      {
        categories: [
          { id: 'ch-most-champ-games', label: 'Most Championship Games' },
          { id: 'ch-most-consec-champ-games', label: 'Most Consecutive Championship Games' },
          { id: 'ch-most-champ-game-losses', label: 'Most Championship Game Losses' },
          { id: 'ch-most-champ-wins', label: 'Most Championships' },
          { id: 'ch-most-consec-champ-wins', label: 'Most Consecutive Championships' },
        ],
      },
    ],
  },
  {
    title: 'Points & Margins',
    groups: [
      {
        heading: 'Margin of Victory',
        categories: [
          { id: 'mov-largest-week', label: 'Largest, Single Week' },
          { id: 'mov-largest-week-playoffs', label: 'Largest, Playoffs' },
          { id: 'mov-largest-week-champ', label: 'Largest, Championship' },
          { id: 'mov-smallest-week', label: 'Narrowest Win' },
        ],
      },
      {
        heading: 'Team Points, Most',
        categories: [
          { id: 'tp-most-week', label: 'Single Week' },
          { id: 'tp-most-season-avg', label: 'Season Average' },
          { id: 'tp-most-champ-game', label: 'Championship Game' },
          { id: 'tp-most-playoffs-avg', label: 'Playoffs Average' },
          { id: 'tp-most-miss-playoffs', label: 'Most, While Missing Playoffs' },
          { id: 'tp-most-losing-effort', label: 'Most, in a Loss' },
        ],
      },
      {
        heading: 'Team Points, Least',
        categories: [
          { id: 'tp-least-week', label: 'Single Week' },
          { id: 'tp-least-season-avg', label: 'Season Average' },
          { id: 'tp-least-make-playoffs', label: 'Fewest, While Making Playoffs' },
        ],
      },
      {
        heading: 'Schedule & Differential',
        categories: [
          { id: 'sos-hardest', label: 'Strength of Schedule, Hardest' },
          { id: 'sos-easiest', label: 'Strength of Schedule, Easiest' },
          { id: 'pd-best', label: 'Point Differential, Best (Career)' },
          { id: 'pd-worst', label: 'Point Differential, Worst (Career)' },
        ],
      },
    ],
  },
  {
    title: 'Union Power Rating',
    groups: [
      {
        categories: [
          { id: 'upr-career-high', label: 'Highest UPR, Career' },
          { id: 'upr-career-low', label: 'Lowest UPR, Career' },
          { id: 'upr-season-high', label: 'Highest UPR, Single Season' },
          { id: 'upr-season-low', label: 'Lowest UPR, Single Season' },
        ],
      },
    ],
  },
]

/** Every category id in the book (for validation + the page's TBD accounting). */
export const ALL_CATEGORY_IDS: string[] = RECORD_BOOK_SECTIONS.flatMap((s) =>
  s.groups.flatMap((g) => g.categories.map((c) => c.id)),
)
