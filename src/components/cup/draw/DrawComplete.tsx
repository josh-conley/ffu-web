import { useRef, type ReactNode } from 'react'
import { CUP_ACCENT, CUP_NAME, CUP_YEAR } from '@/config'
import { drawCommand } from '@/lib/drawSheet.mjs'
import { CopyImageButton } from '../../CopyImageButton'
import { BUTTON } from '../../controls'

// The end of the draw: the completed bracket in one screenshot-ready block — the call's closing
// shot and the FFUN's write-up — then what the operator does next. The downloads live here and ONLY
// here: offered mid-draw, one stray click put the whole unrevealed bracket in the download bar.

export function DrawComplete({ seed, checkCode, onDownload, children }: {
  seed: string
  checkCode: string
  onDownload: (kind: 'txt' | 'csv') => void
  /** The completed bracket — the same one that filled in during the draw. */
  children: ReactNode
}) {
  const panel = useRef<HTMLDivElement>(null)

  return (
    <section className="space-y-3" aria-label="Draw complete">
      <div ref={panel} className="space-y-3 border-2 bg-bg p-4" style={{ borderColor: CUP_ACCENT }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-extrabold uppercase tracking-tight">
            {CUP_NAME} {CUP_YEAR} · Round of 36
          </h2>
          <p className="text-xs font-bold uppercase tracking-widest text-muted">
            Seed <span className="font-mono text-sm normal-case tracking-normal text-text">{seed}</span>
            <span className="mx-2">·</span>
            Check <span className="font-mono text-sm tracking-normal text-text">{checkCode}</span>
          </p>
        </div>
        {children}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <CopyImageButton targetRef={panel} filename={`ffu-cup-draw-${CUP_YEAR}.png`} />
        <button type="button" className={BUTTON} onClick={() => onDownload('txt')}>
          Download sheet
        </button>
        <button type="button" className={BUTTON} onClick={() => onDownload('csv')}>
          CSV
        </button>
      </div>
      <p className="text-sm text-muted">
        Record the seed, then run <code className="font-mono text-text">{drawCommand(seed)}</code> to write the
        official bracket. Its sheet prints a check code: it must read <span className="font-mono text-text">{checkCode}</span>.
      </p>
    </section>
  )
}
