import { memo } from 'react'
import type { Course } from '@/lib/marbleRace/course'

// The course, drawn from the same shapes the marbles collided with. Static, so it is memoised and
// never re-renders while the race plays.

const CHECK = 16

function FinishLine({ y, width }: { y: number; width: number }) {
  const squares = Math.ceil(width / CHECK)
  return (
    <g aria-hidden>
      {Array.from({ length: squares * 2 }, (_, i) => {
        const col = i % squares
        const row = Math.floor(i / squares)
        return (col + row) % 2 === 0 ? (
          <rect key={i} x={col * CHECK} y={y - CHECK + row * CHECK} width={CHECK} height={CHECK} fill="var(--color-text)" />
        ) : null
      })}
    </g>
  )
}

export const CourseLayer = memo(function CourseLayer({ course }: { course: Course }) {
  return (
    <g>
      <rect x={0} y={0} width={course.width} height={course.height} fill="var(--color-surface)" />
      {course.shapes.map((s, i) =>
        s.kind === 'peg' ? (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="var(--color-muted)" />
        ) : (
          <rect
            key={i}
            x={-s.w / 2}
            y={-s.h / 2}
            width={s.w}
            height={s.h}
            fill="var(--color-border)"
            stroke="var(--color-muted)"
            transform={`translate(${s.x} ${s.y}) rotate(${(s.angle * 180) / Math.PI})`}
          />
        ),
      )}
      <FinishLine y={course.finishY} width={course.width} />
    </g>
  )
})
