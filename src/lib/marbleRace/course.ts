// The marble-race course, as plain geometry. It is DATA, not physics: the simulation turns these
// shapes into static bodies, and the renderer draws the very same shapes as SVG, so what viewers
// see is exactly what the marbles collided with.
//
// Units are course pixels; y grows downwards (marbles race top to bottom). Rects are centre-based
// with an angle in radians, the way the physics engine takes them.

export type CourseShape =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; angle: number }
  | { kind: 'peg'; x: number; y: number; r: number }

export interface Course {
  width: number
  height: number
  /** Crossing this y is finishing. */
  finishY: number
  /** Marbles are dropped in rows inside this band at the top. */
  spawn: { top: number; left: number; right: number }
  marbleRadius: number
  shapes: CourseShape[]
}

const WIDTH = 800
const WALL = 20
const PLANK = 14

/** A plank from one wall sloping down across the course, leaving a gap at the far end to drop through. */
function ramp(y: number, fromLeft: boolean, gap: number, drop: number): CourseShape {
  const span = WIDTH - WALL * 2 - gap
  const length = Math.hypot(span, drop)
  const angle = Math.atan2(drop, span) * (fromLeft ? 1 : -1)
  const x = fromLeft ? WALL + span / 2 : WIDTH - WALL - span / 2
  return { kind: 'rect', x, y: y + drop / 2, w: length, h: PLANK, angle }
}

/** Staggered rows of pegs: the chaotic stretch, where the order gets shuffled. */
function pegField(top: number, rows: number, spacing: number): CourseShape[] {
  const pegs: CourseShape[] = []
  for (let row = 0; row < rows; row++) {
    const offset = row % 2 === 0 ? spacing / 2 : spacing
    for (let x = WALL + offset; x < WIDTH - WALL - 10; x += spacing) {
      pegs.push({ kind: 'peg', x, y: top + row * spacing * 0.75, r: 6 })
    }
  }
  return pegs
}

/** Two walls closing in to a single-file chute, so marbles cross the line one at a time. */
function funnel(top: number, depth: number, mouth: number): CourseShape[] {
  const inner = (WIDTH - WALL * 2 - mouth) / 2
  const length = Math.hypot(inner, depth)
  const angle = Math.atan2(depth, inner)
  return [
    { kind: 'rect', x: WALL + inner / 2, y: top + depth / 2, w: length, h: PLANK, angle },
    { kind: 'rect', x: WIDTH - WALL - inner / 2, y: top + depth / 2, w: length, h: PLANK, angle: -angle },
  ]
}

function buildCourse(): Course {
  const shapes: CourseShape[] = [
    ramp(200, true, 110, 150),
    ramp(470, false, 110, 150),
    ramp(740, true, 110, 150),
    ...pegField(1010, 6, 88),
    ramp(1460, false, 120, 140),
    ramp(1720, true, 120, 140),
    ramp(1980, false, 120, 140),
    ...pegField(2240, 3, 88),
    ...funnel(2500, 220, 70),
  ]
  const finishY = 2790
  // A shallow tray under the line, so finishers pile up where the camera (holding on the finish) can see them.
  const height = finishY + 200
  // Walls run the full height; a floor catches finishers in a tray below the line.
  shapes.push(
    { kind: 'rect', x: WALL / 2, y: height / 2, w: WALL, h: height, angle: 0 },
    { kind: 'rect', x: WIDTH - WALL / 2, y: height / 2, w: WALL, h: height, angle: 0 },
    { kind: 'rect', x: WIDTH / 2, y: height - WALL / 2, w: WIDTH, h: WALL, angle: 0 },
  )
  return { width: WIDTH, height, finishY, spawn: { top: 30, left: 60, right: WIDTH - 60 }, marbleRadius: 17, shapes }
}

export const COURSE: Course = buildCourse()
