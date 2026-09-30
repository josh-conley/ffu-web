import Matter from 'matter-js'
import type { Course } from './course'

// Runs one race, headless and fast, and RECORDS it. The page never simulates live: it plays back
// this recording, so what is broadcast is exactly the race that decided the finishing order, on
// any machine and at any frame rate.

export const FPS = 60

export interface RaceRecording {
  count: number
  frames: number
  /** Frame-major positions: [x0, y0, x1, y1, …] for frame 0, then frame 1, … */
  positions: Float32Array
  /** Frame each marble crossed the finish line, or -1 if it never did. */
  finishFrame: number[]
  /** Marble indices, first to last: finishers by crossing time, then the rest by how far they got. */
  order: number[]
}

/** Staggered rows across the top, jittered by `rng` so each race variant starts differently. */
function spawnPoints(course: Course, count: number, rng: () => number): { x: number; y: number }[] {
  const { top, left, right } = course.spawn
  const gap = course.marbleRadius * 2.6
  const perRow = Math.max(1, Math.floor((right - left) / gap))
  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / perRow)
    const col = i % perRow
    const stagger = row % 2 === 0 ? 0 : gap / 2
    return {
      x: left + col * gap + stagger + (rng() - 0.5) * gap * 0.5,
      y: top + row * gap + (rng() - 0.5) * 6,
    }
  })
}

function staticBodies(course: Course): Matter.Body[] {
  const opts = { isStatic: true, friction: 0.02, restitution: 0.3 }
  return course.shapes.map((s) =>
    s.kind === 'peg'
      ? Matter.Bodies.circle(s.x, s.y, s.r, opts)
      : Matter.Bodies.rectangle(s.x, s.y, s.w, s.h, { ...opts, angle: s.angle }),
  )
}

/** Final order: finishers by frame, then non-finishers by distance travelled (y). */
function finishingOrder(finishFrame: number[], lastY: number[]): number[] {
  return finishFrame
    .map((f, i) => ({ i, f, y: lastY[i]! }))
    .sort((a, b) => {
      if (a.f >= 0 && b.f >= 0) return a.f - b.f || b.y - a.y
      if (a.f >= 0 || b.f >= 0) return a.f >= 0 ? -1 : 1
      return b.y - a.y
    })
    .map((m) => m.i)
}

/**
 * Races `count` marbles down `course`. Stops `tailFrames` after the first marble finishes, or at
 * `maxFrames`. Deterministic: the same inputs and the same rng sequence give the same race.
 */
export function simulateRace(course: Course, count: number, rng: () => number, maxFrames = FPS * 30, tailFrames = FPS * 2): RaceRecording {
  const engine = Matter.Engine.create({ gravity: { x: 0, y: 1, scale: 0.001 } })
  const marbles = spawnPoints(course, count, rng).map((p) =>
    Matter.Bodies.circle(p.x, p.y, course.marbleRadius, { restitution: 0.4, friction: 0.004, frictionAir: 0.0006, density: 0.002 }),
  )
  Matter.Composite.add(engine.world, [...staticBodies(course), ...marbles])

  const finishFrame = Array<number>(count).fill(-1)
  const frames: number[][] = []
  let stopAt = maxFrames
  for (let frame = 0; frame < stopAt; frame++) {
    Matter.Engine.update(engine, 1000 / FPS)
    const row: number[] = []
    marbles.forEach((m, i) => {
      row.push(m.position.x, m.position.y)
      if (finishFrame[i] === -1 && m.position.y >= course.finishY) finishFrame[i] = frame
    })
    frames.push(row)
    if (stopAt === maxFrames && finishFrame.some((f) => f >= 0)) stopAt = Math.min(maxFrames, frame + tailFrames)
  }
  Matter.Engine.clear(engine)

  const lastY = marbles.map((m) => m.position.y)
  return { count, frames: frames.length, positions: Float32Array.from(frames.flat()), finishFrame, order: finishingOrder(finishFrame, lastY) }
}
