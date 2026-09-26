// Extends Vitest's `expect` with jest-dom matchers (toBeInTheDocument, etc.)
// and auto-cleans the DOM between tests. Wired via vite.config.ts `test.setupFiles`.
import '@testing-library/jest-dom/vitest'

// jsdom has <dialog> but not its modal API. A minimal stand-in: toggles `open` and fires `close`
// like the browser does, which is all the shared Dialog relies on (inertness and the top layer are
// the browser's job and aren't under test).
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.open) return
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
}
