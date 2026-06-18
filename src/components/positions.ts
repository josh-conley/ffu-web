// Single source of position presentation (Charter DRY) — used by the draft board (badge + whole-
// cell tint) and the draft list (badge). Deliberate semantic colors, kept through the styling
// overhaul.

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

/** Subtle whole-cell tint by position (lighter than the badge so the two layers read as one pick). */
const POS_BG: Record<string, string> = {
  QB: 'bg-red-50 dark:bg-red-500/10',
  RB: 'bg-emerald-50 dark:bg-emerald-500/10',
  WR: 'bg-sky-50 dark:bg-sky-500/10',
  TE: 'bg-amber-50 dark:bg-amber-500/10',
  K: 'bg-purple-50 dark:bg-purple-500/10',
  DEF: 'bg-surface-2',
}

/** Solid saturated position color (background only) — for color spines, dots, and bars. */
const POS_SOLID: Record<string, string> = {
  QB: 'bg-red-500',
  RB: 'bg-emerald-500',
  WR: 'bg-sky-500',
  TE: 'bg-amber-400',
  K: 'bg-purple-500',
  DEF: 'bg-slate-400',
}

/** Solid position color used as a filled bar/chyron, paired with a readable foreground. */
const POS_BAR: Record<string, string> = {
  QB: 'bg-red-500 text-white',
  RB: 'bg-emerald-600 text-white',
  WR: 'bg-sky-600 text-white',
  TE: 'bg-amber-400 text-black',
  K: 'bg-purple-600 text-white',
  DEF: 'bg-slate-500 text-white',
}

export const posClass = (p: string) => POS_COLOR[p] ?? 'bg-surface-2 text-muted'
export const posBg = (p: string) => POS_BG[p] ?? 'bg-surface-2'
export const posSolid = (p: string) => POS_SOLID[p] ?? 'bg-muted'
export const posBar = (p: string) => POS_BAR[p] ?? 'bg-surface-2 text-text'
