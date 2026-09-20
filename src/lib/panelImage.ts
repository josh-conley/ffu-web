import { downloadBlob } from './download'

/**
 * Turn a piece of the page into a PNG on the clipboard — for the Around the Union panel, which
 * exists to be pasted into the FFUN. The alternative is the author screenshotting and cropping by
 * hand every week, which is the chore this page set out to remove.
 *
 * Rendering is DOM → canvas via html-to-image, so what lands on the clipboard is exactly what is on
 * screen, the viewer's light/dark theme included.
 */

/** Rendered at 2x so the PNG stays sharp when the newsletter scales or prints it. */
const PIXEL_RATIO = 2

export type CopyOutcome = 'copied' | 'downloaded'

async function renderPng(el: HTMLElement): Promise<Blob> {
  // Imported on demand: the renderer is the largest thing this page touches and only this button
  // needs it, so it stays out of the main bundle and off every other page's load.
  const { toBlob } = await import('html-to-image')
  const box = el.getBoundingClientRect()
  const blob = await toBlob(el, {
    pixelRatio: PIXEL_RATIO,
    // Sized from the REAL box, rounded up. Left alone, html-to-image measures with clientWidth /
    // clientHeight, which round a fractional layout box DOWN — on a panel sized to its own content
    // (the FFUN layout) that shaves the last pixel column off the capture.
    width: Math.ceil(box.width),
    height: Math.ceil(box.height),
    // The panel's own background is semi-transparent over the page's. Paint the page background
    // behind it so the PNG is opaque — a transparent one pasted into a light document would show
    // white through a dark panel.
    backgroundColor: getComputedStyle(document.body).backgroundColor,
  })
  if (blob === null) throw new Error('The panel could not be rendered to an image')
  return blob
}

const canWriteImages = (): boolean =>
  typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function'

/**
 * Copy `el` to the clipboard as a PNG, falling back to a download when the browser won't take an
 * image (Firefox until recently, any browser where the user has denied clipboard access, and every
 * insecure origin). The caller is told which happened so it can say so.
 */
export async function copyElementAsImage(el: HTMLElement, filename: string): Promise<CopyOutcome> {
  const png = renderPng(el)
  if (canWriteImages()) {
    try {
      // The PROMISE form rather than an awaited blob: Safari counts the user gesture as spent once
      // an await has resolved, and rejects a clipboard write issued after it.
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
      return 'copied'
    } catch {
      // Fall through to the download. The promise is already settled, so nothing renders twice.
    }
  }
  downloadBlob(filename, await png)
  return 'downloaded'
}
