/**
 * Document Picture-in-Picture: an always-on-top mini window that holds ordinary HTML, not just a
 * <video>. Chrome and Edge on desktop only (116+); Firefox and Safari have no equivalent, so every
 * caller checks `pipSupported()` and simply offers nothing where it's false.
 * https://developer.chrome.com/docs/web-platform/document-picture-in-picture
 *
 * The window is an empty document: React renders into it through a portal, and this module gives it
 * the page's stylesheets and theme so the portal's markup looks the same as it does on the page.
 */

// Not in TypeScript's DOM lib yet; only the parts used here.
interface DocumentPictureInPicture {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>
}
declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture
  }
}

export const pipSupported = (): boolean => typeof window !== 'undefined' && window.documentPictureInPicture !== undefined

/**
 * Every stylesheet on the page, copied in. A <link> is cloned (the browser fetches it again, from
 * cache); an inline <style> — what Vite injects in dev — is copied rule by rule.
 */
function copyStyles(to: Document) {
  for (const sheet of Array.from(document.styleSheets)) {
    const owner = sheet.ownerNode
    if (owner instanceof HTMLLinkElement) {
      to.head.append(owner.cloneNode())
      continue
    }
    const style = to.createElement('style')
    style.textContent = Array.from(sheet.cssRules, (rule) => rule.cssText).join('\n')
    to.head.append(style)
  }
}

/** Dark mode is a `.dark` class on <html> (useTheme); mirrored now and on every toggle after. */
function mirrorTheme(to: Document): () => void {
  const sync = () => (to.documentElement.className = document.documentElement.className)
  sync()
  const observer = new MutationObserver(sync)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

export interface PipWindow {
  window: Window
  /** Where the portal renders. */
  root: HTMLElement
}

/**
 * Opens the window. Must be called from a user gesture (a click), or the browser refuses. Opening
 * a second one replaces the first: the browser allows one per tab. `onClose` fires however it
 * closes — its own ✕, `window.close()`, or the tab going away.
 */
export async function openPipWindow(size: { width: number; height: number }, title: string, onClose: (closed: Window) => void): Promise<PipWindow> {
  const api = window.documentPictureInPicture
  if (!api) throw new Error('Document Picture-in-Picture is not supported in this browser')
  const pip = await api.requestWindow(size)
  pip.document.title = title
  copyStyles(pip.document)
  const stopTheme = mirrorTheme(pip.document)
  pip.document.body.className = 'bg-bg text-text'
  const root = pip.document.createElement('div')
  pip.document.body.append(root)
  pip.addEventListener('pagehide', () => {
    stopTheme()
    onClose(pip)
  })
  return { window: pip, root }
}
