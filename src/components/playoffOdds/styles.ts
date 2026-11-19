// Shared by both Playoff Odds tables (by record, by UPR), so the two views read as one page.

export const CELL = 'border border-border px-3 py-1.5'
// No wrapping in the headers or the odds: the team list is the column that soaks up the width.
export const HEAD = 'border border-border px-3 py-2 whitespace-nowrap text-center text-xs font-bold'
export const ODDS = `${CELL} whitespace-nowrap text-center font-mono tabular-nums`
/** The first column: the record or UPR range the row is about. */
export const ROW_HEAD = `${CELL} whitespace-nowrap text-center font-mono font-bold tabular-nums`
export const TEAMS = `${CELL} w-full text-left`
