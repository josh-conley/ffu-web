/**
 * Hands the user a file from the browser: one blob, one download. Single home for the anchor dance
 * (Charter DRY) — `components/cup/draw/downloads.ts` builds its sheet/CSV on top of this, and the
 * Around the Union panel falls back to it when the clipboard won't take an image.
 */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
