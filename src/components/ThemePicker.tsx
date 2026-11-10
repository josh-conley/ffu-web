import { useCallback, useId, useRef, useState } from 'react'
import { FaCheck, FaPalette, FaVolumeHigh, FaVolumeXmark } from 'react-icons/fa6'
import { useDisclosureDismiss } from '@/hooks/useDisclosureDismiss'
import { useTheme } from '@/hooks/useTheme'
import { THEMES } from '@/themes/registry'

const ROW =
  'flex min-h-11 w-full items-center justify-between gap-3 border-l-2 px-3 py-2 text-left text-sm font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent md:min-h-0'
const ROW_IDLE = 'border-transparent text-text hover:border-accent hover:bg-surface-2'

/**
 * Header control for the site theme: a disclosure (same pattern and panel styling as NavMenu) listing
 * every theme, plus the opt-in sound switch for skins. The trigger lives in the always-dark header,
 * so its colors are fixed light; the panel is ordinary themed surface.
 */
export function ThemePicker() {
  const { theme, sound, setTheme, setSound } = useTheme()
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDisclosureDismiss(open, wrapRef, triggerRef, close)

  return (
    <div ref={wrapRef} className="relative md:ml-1">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Theme"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={`flex size-11 items-center justify-center transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 md:size-9 ${
          open ? 'bg-white/10 text-white' : 'text-white/70'
        }`}
      >
        <FaPalette aria-hidden size={17} />
      </button>

      {open && (
        <div id={panelId} className="absolute right-0 top-full z-30 w-56 pt-1.5">
          <div className="flex flex-col border border-border bg-surface shadow-xl">
            <span aria-hidden className="h-0.5 bg-accent" />
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={t.id === theme}
                onClick={() => setTheme(t.id)}
                className={`${ROW} ${t.id === theme ? 'border-accent bg-accent text-accent-fg' : ROW_IDLE}`}
              >
                {t.label}
                {t.id === theme && <FaCheck aria-hidden size={12} />}
              </button>
            ))}
            {/* Sound is opt-in and only the skins have any, but the switch is always here so it
                can be set before picking one. */}
            <button
              type="button"
              role="switch"
              aria-checked={sound}
              onClick={() => setSound(!sound)}
              className={`${ROW} ${ROW_IDLE} border-t border-t-border`}
            >
              Theme sounds
              <span className="flex items-center gap-1.5 text-xs text-muted">
                {sound ? 'On' : 'Off'}
                {sound ? <FaVolumeHigh aria-hidden size={13} /> : <FaVolumeXmark aria-hidden size={13} />}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
