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
  DEF: 'bg-amber-200 text-amber-900 dark:bg-amber-700/25 dark:text-amber-400',
  // Lineup slots (not draft positions): FLEX is RB/WR/TE-eligible — purple, clearly off RB's green.
  FLEX: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
  SUPER_FLEX: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
}

/** Position "chyron" bar for the draft board's pick nameplates (bg + text, per position). The skill
 *  positions use a soft pastel with near-black text in light mode and a deeper fill with white text
 *  in dark mode. DEF is the exception: a genuine brown only reads as brown when it's dark, so it
 *  stays a deep brown (white text) in BOTH modes — which also keeps it clearly apart from QB (red)
 *  and TE (yellow), the warm neighbors it used to blur into. */
const POS_BAR: Record<string, string> = {
  QB: 'bg-red-300 text-slate-900 dark:bg-red-700 dark:text-white',
  RB: 'bg-emerald-300 text-slate-900 dark:bg-emerald-700 dark:text-white',
  WR: 'bg-sky-300 text-slate-900 dark:bg-sky-700 dark:text-white',
  TE: 'bg-yellow-300 text-slate-900 dark:bg-yellow-700 dark:text-white',
  K: 'bg-purple-300 text-slate-900 dark:bg-purple-700 dark:text-white',
  DEF: 'bg-amber-800 text-white dark:bg-amber-900 dark:text-white',
}

/** Pale background-only tint (no text color) for filling a whole surface, e.g. the draft-board pick
 *  card body — soft enough to keep default text readable in light + dark. */
const POS_TINT: Record<string, string> = {
  QB: 'bg-red-50 dark:bg-red-500/10',
  RB: 'bg-emerald-50 dark:bg-emerald-500/10',
  WR: 'bg-sky-50 dark:bg-sky-500/10',
  TE: 'bg-yellow-50 dark:bg-yellow-500/10',
  K: 'bg-purple-50 dark:bg-purple-500/10',
  DEF: 'bg-amber-100/70 dark:bg-amber-800/15',
}

export const posClass = (p: string) => POS_COLOR[p] ?? 'bg-surface-2 text-muted'
export const posBar = (p: string) => POS_BAR[p] ?? 'bg-surface-2 text-text'
export const posTint = (p: string) => POS_TINT[p] ?? 'bg-surface'
