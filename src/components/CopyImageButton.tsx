import { useEffect, useRef, useState, type RefObject } from 'react'
import { FaCheck, FaDownload, FaRegCopy, FaTriangleExclamation } from 'react-icons/fa6'
import { copyElementAsImage } from '@/lib/panelImage'
import { BUTTON } from './controls'

/**
 * Copies a panel to the clipboard as an image. Built for the FFUN author: toggle to the layout,
 * click once, paste into the newsletter.
 *
 * Reports the outcome on the button itself rather than in a toast — the result is about the button
 * you just pressed, and "Downloaded" (the fallback when a browser won't take an image on the
 * clipboard) needs to be seen or the file looks like it went nowhere.
 */
type Status = 'idle' | 'working' | 'copied' | 'downloaded' | 'failed'

const FACES: Record<Status, { icon: React.ReactNode; label: string; title?: string }> = {
  idle: { icon: <FaRegCopy aria-hidden />, label: 'Copy image' },
  working: { icon: <FaRegCopy aria-hidden />, label: 'Rendering…' },
  copied: { icon: <FaCheck aria-hidden />, label: 'Copied' },
  downloaded: {
    icon: <FaDownload aria-hidden />,
    label: 'Downloaded',
    title: "This browser won't put an image on the clipboard, so the panel was saved as a PNG instead.",
  },
  failed: { icon: <FaTriangleExclamation aria-hidden />, label: "Couldn't copy" },
}

/** How long a result stays on the button before it offers itself again. */
const RESET_MS = 2500

export function CopyImageButton({ targetRef, filename }: { targetRef: RefObject<HTMLElement | null>; filename: string }) {
  const [status, setStatus] = useState<Status>('idle')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    const el = targetRef.current
    if (el === null) return
    setStatus('working')
    try {
      setStatus(await copyElementAsImage(el, filename))
    } catch {
      setStatus('failed')
    }
    timer.current = setTimeout(() => setStatus('idle'), RESET_MS)
  }

  const face = FACES[status]
  return (
    <button
      type="button"
      className={BUTTON}
      onClick={() => void copy()}
      disabled={status === 'working'}
      title={face.title}
      // The label changes to report the outcome, so screen readers are told without a live region.
      aria-label={status === 'idle' ? 'Copy the panel to the clipboard as an image' : face.label}
    >
      {face.icon}
      {face.label}
    </button>
  )
}
