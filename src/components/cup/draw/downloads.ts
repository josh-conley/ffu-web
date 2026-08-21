/**
 * Hands the operator a file. The canonical record of a draw is still its SEED — one number
 * regenerates the whole bracket through `npm run draw-cup` — but a sheet is what actually gets
 * pasted into Discord the same night, so the page offers both formats.
 */
export function downloadText(filename: string, text: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
