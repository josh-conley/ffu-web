import type { RaceRecording } from './simulate'

// Reading a recorded race back at a given frame: where each marble is, and the running order the
// leaderboard shows. Pure, so the broadcast view is only drawing.

export function positionAt(r: RaceRecording, frame: number, marble: number): { x: number; y: number } {
  const f = Math.max(0, Math.min(r.frames - 1, frame))
  const at = (f * r.count + marble) * 2
  return { x: r.positions[at]!, y: r.positions[at + 1]! }
}

/**
 * Running order at `frame`: marbles already over the line in the order they crossed, then the
 * rest by how far down the course they are.
 */
export function standingsAt(r: RaceRecording, frame: number): number[] {
  const crossed = (i: number) => r.finishFrame[i]! >= 0 && r.finishFrame[i]! <= frame
  return Array.from({ length: r.count }, (_, i) => i).sort((a, b) => {
    const ca = crossed(a)
    const cb = crossed(b)
    if (ca && cb) return r.finishFrame[a]! - r.finishFrame[b]!
    if (ca !== cb) return ca ? -1 : 1
    return positionAt(r, frame, b).y - positionAt(r, frame, a).y
  })
}

/**
 * Where the camera wants its top edge: the leader a little above centre, never past either end
 * of the course. Once the winner is over the line it holds on the finish.
 */
export function cameraTop(r: RaceRecording, frame: number, finishY: number, viewHeight: number, courseHeight: number): number {
  let lead = 0
  for (let i = 0; i < r.count; i++) lead = Math.max(lead, positionAt(r, frame, i).y)
  const focus = Math.min(lead, finishY)
  return Math.max(0, Math.min(courseHeight - viewHeight, focus - viewHeight * 0.45))
}
