import { downloadBlob } from '@/lib/download'

/**
 * Hands the operator a file. The canonical record of a draw is still its SEED — one number
 * regenerates the whole bracket through `npm run draw-cup` — but a sheet is what actually gets
 * pasted into Discord the same night, so the page offers both formats.
 */
export function downloadText(filename: string, text: string, mime: string): void {
  downloadBlob(filename, new Blob([text], { type: `${mime};charset=utf-8` }))
}
