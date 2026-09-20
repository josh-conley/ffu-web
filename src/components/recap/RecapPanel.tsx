import { useRef, type ReactNode } from 'react'
import { CopyImageButton } from '../CopyImageButton'
import { PanelFrame } from './PanelFrame'

/**
 * A recap block, optionally with its own copy-as-image button.
 *
 * Each block copies SEPARATELY rather than the page offering one capture of everything: the FFUN
 * has a different amount of room each week, and the author picks the two or three blocks that fit.
 * A single growing panel would have outgrown the slot the first one was tuned to.
 *
 * `copyFilename` is what makes a block copyable. Without it (the home page's read-only view) the
 * panel spans its container like any other section; with it, the captured box takes the fixed
 * capture width below.
 */

/**
 * One width for every captured block.
 *
 * The blocks end up side by side in the same newsletter, and a block's width decides how big its
 * text prints once it is scaled to the column — so blocks of different widths would paste at
 * different scales and stop looking like a set. 55rem also clears the widest band in any of them
 * (the main panel's league ticker, which needs 870px and may not wrap) with a little slack for the
 * clone the copy renders. Phones get the fluid width instead, where none of this applies.
 */
const CAPTURE_WIDTH = 'w-full sm:w-[55rem]'

export function RecapPanel({
  title,
  meta,
  compact,
  copyFilename,
  children,
}: {
  title: string
  meta?: string
  compact: boolean
  copyFilename?: string
  children: ReactNode
}) {
  // On the WRAPPER, not the frame, so the ref survives a layout switch.
  const target = useRef<HTMLDivElement>(null)
  const frame = (
    <PanelFrame title={title} meta={meta} compact={compact}>
      {children}
    </PanelFrame>
  )

  if (copyFilename === undefined) return frame
  return (
    <div className="space-y-2">
      <CopyImageButton targetRef={target} filename={copyFilename} />
      <div ref={target} className={compact ? CAPTURE_WIDTH : undefined}>
        {frame}
      </div>
    </div>
  )
}
