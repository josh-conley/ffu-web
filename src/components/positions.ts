// Single source of position presentation (Charter DRY) — the soft badge (`posClass`, used by the
// draft list, box score, and board legend) and the saturated chyron bar (`posBar`, the draft board's
// pick nameplates). Deliberate semantic colors, kept through the styling overhaul.

/** Filled badge pill for a position label. */
const POS_COLOR: Record<string, string> = {
  QB: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  RB: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  WR: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  TE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300',
  K: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
  DEF: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300',
  // Lineup slots (not draft positions): FLEX is RB/WR/TE-eligible — purple, clearly off RB's green.
  FLEX: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
  SUPER_FLEX: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
}

/** Position "chyron" bar for the draft board's pick nameplates. Background only (posBar() appends a
 *  shared text color): a soft pastel in light mode, a deeper fill in dark mode — so the label text
 *  goes near-black → white to match. TE uses a deep amber in dark mode so white text stays readable
 *  like every other position (previously it was the lone black-on-light-amber outlier). */
const POS_BAR: Record<string, string> = {
  QB: 'bg-red-300 dark:bg-red-700',
  RB: 'bg-emerald-300 dark:bg-emerald-700',
  WR: 'bg-sky-300 dark:bg-sky-700',
  TE: 'bg-yellow-300 dark:bg-yellow-700',
  K: 'bg-purple-300 dark:bg-purple-700',
  DEF: 'bg-orange-300 dark:bg-orange-800',
}

/** Pale background-only tint (no text color) for filling a whole surface, e.g. the draft-board pick
 *  card body — soft enough to keep default text readable in light + dark. */
const POS_TINT: Record<string, string> = {
  QB: 'bg-red-50 dark:bg-red-500/10',
  RB: 'bg-emerald-50 dark:bg-emerald-500/10',
  WR: 'bg-sky-50 dark:bg-sky-500/10',
  TE: 'bg-yellow-50 dark:bg-yellow-500/10',
  K: 'bg-purple-50 dark:bg-purple-500/10',
  DEF: 'bg-orange-50 dark:bg-orange-500/10',
}

export const posClass = (p: string) => POS_COLOR[p] ?? 'bg-surface-2 text-muted'
export const posBar = (p: string) => `${POS_BAR[p] ?? 'bg-surface-2'} text-slate-900 dark:text-white`
export const posTint = (p: string) => POS_TINT[p] ?? 'bg-surface'
