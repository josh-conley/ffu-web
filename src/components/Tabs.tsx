import type { KeyboardEvent, ReactNode } from 'react'
import { segButton } from './controls'

// Segmented tabs, styled from controls.ts so they read as the same control family as every other
// toggle on the site. The selected tab is state the CALLER owns (pages keep it in the URL via
// useUrlState), so a tab is linkable and survives a refresh.

export interface TabDef {
  id: string
  label: string
}

export function Tabs({ tabs, value, onChange, label }: {
  tabs: readonly TabDef[]
  value: string
  onChange: (id: string) => void
  /** Accessible name for the tab strip, e.g. "Cup views". */
  label: string
}) {
  // Left/Right move between tabs, as expected of a tablist.
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (delta === 0) return
    e.preventDefault()
    const i = tabs.findIndex((t) => t.id === value)
    const next = tabs[(i + delta + tabs.length) % tabs.length]
    if (next) onChange(next.id)
  }

  return (
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const selected = tab.id === value
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={segButton(selected)}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

/** The panel a tab controls. Render only the selected one. */
export function TabPanel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} tabIndex={0} className="focus-visible:outline-none">
      {children}
    </div>
  )
}
