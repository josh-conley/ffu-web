// Shared form-control styling (Charter DRY — selects + segmented toggles were styled ad-hoc on
// every page). Sharp corners to match the table/broadcast aesthetic; tokens for light+dark.

/** Native <select> / dropdown. */
export const SELECT =
  'border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

/**
 * Segmented / toggle button. Active = solid FFU red; both states are bordered so toggling
 * doesn't shift layout by a pixel.
 */
export function segButton(active: boolean): string {
  const base =
    'border px-3 py-1.5 text-sm font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'
  return active
    ? `${base} border-accent bg-accent text-accent-fg`
    : `${base} border-border bg-surface text-muted hover:bg-surface-2 hover:text-text`
}
