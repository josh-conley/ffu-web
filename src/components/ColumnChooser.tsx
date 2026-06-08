import { segButton } from './controls'

// A "Columns" popover of checkboxes to show/hide table columns. Presentational — visibility state
// lives in useColumnVisibility. Uses a native <details> so it's keyboard-operable and closes on
// blur with no open-state bookkeeping. `locked` keys are always shown (e.g. the pinned Team column).

export interface ColumnOption {
  key: string
  header: string
}

export function ColumnChooser({
  options,
  hidden,
  onToggle,
  onReset,
  locked = [],
}: {
  options: ColumnOption[]
  hidden: Set<string>
  onToggle: (key: string) => void
  onReset: () => void
  locked?: string[]
}) {
  const shown = options.filter((o) => locked.includes(o.key) || !hidden.has(o.key)).length
  const anyHidden = shown < options.length

  return (
    <details className="group relative">
      <summary className={`${segButton(anyHidden)} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
        Columns{anyHidden ? ` · ${shown}/${options.length}` : ''}
      </summary>
      <div className="absolute right-0 z-30 mt-1 max-h-80 w-56 overflow-auto border border-border bg-surface p-2 shadow-lg">
        <div className="flex items-center justify-between px-1 pb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Show columns</span>
          <button type="button" onClick={onReset} className="text-xs font-medium text-muted hover:text-text hover:underline">
            Reset
          </button>
        </div>
        <ul className="space-y-0.5">
          {options.map((o) => {
            const isLocked = locked.includes(o.key)
            return (
              <li key={o.key}>
                <label className={`flex items-center gap-2 px-1 py-1 text-sm ${isLocked ? 'text-muted' : 'cursor-pointer hover:bg-surface-2'}`}>
                  <input
                    type="checkbox"
                    className="accent-accent"
                    checked={isLocked || !hidden.has(o.key)}
                    disabled={isLocked}
                    onChange={() => onToggle(o.key)}
                  />
                  {o.header}
                </label>
              </li>
            )
          })}
        </ul>
      </div>
    </details>
  )
}
