// Single source of position presentation (Charter DRY) — the soft badge (`posClass`, used by the
// draft list, box score, and board legend) and the saturated chyron bar (`posBar`, the draft board's
// pick nameplates). Deliberate semantic colors, kept through the styling overhaul.

/** Filled badge pill for a position label. */
const POS_COLOR: Record<string, string> = {
  QB: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  RB: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  WR: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  TE: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  K: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
  DEF: 'bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300',
  // Lineup slots (not draft positions): FLEX is RB/WR/TE-eligible — purple, clearly off RB's green.
  FLEX: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
  SUPER_FLEX: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
}

/** Solid position color used as a filled bar/chyron (the draft board), paired with a readable
 *  foreground. Saturated by design — the draft board's color identity is its picks. */
const POS_BAR: Record<string, string> = {
  QB: 'bg-red-500 text-white',
  RB: 'bg-emerald-600 text-white',
  WR: 'bg-sky-600 text-white',
  TE: 'bg-amber-400 text-black',
  K: 'bg-purple-600 text-white',
  DEF: 'bg-slate-500 text-white',
}

export const posClass = (p: string) => POS_COLOR[p] ?? 'bg-surface-2 text-muted'
export const posBar = (p: string) => POS_BAR[p] ?? 'bg-surface-2 text-text'
