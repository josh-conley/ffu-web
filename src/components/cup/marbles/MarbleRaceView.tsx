import { useEffect, useRef, useState } from 'react'
import { getMember } from '@/config'
import type { BowlSlot } from '@/selectors'
import { cameraTop, positionAt, standingsAt } from '@/lib/marbleRace/playback'
import type { MarbleRace } from '@/lib/marbleRace/race'
import { FPS } from '@/lib/marbleRace/simulate'
import { CourseLayer } from './CourseLayer'
import { RaceLeaderboard } from './RaceLeaderboard'

// Plays back a recorded race. Marbles and camera move by writing SVG attributes straight from the
// animation frame: 24 marbles at 60fps through React state would re-render the whole course every
// frame. React only re-renders the leaderboard, a few times a second.

/** Course units visible at once (the course is 800 wide). */
const VIEW_H = 470
/** Leaderboard refresh, in frames — ten times a second reads as live without churning. */
const BOARD_EVERY = 6

function Marble({ ffuId, tier, r, refFn }: { ffuId: string; tier: string; r: number; refFn: (el: SVGGElement | null) => void }) {
  const clip = `marble-${ffuId}`
  return (
    <g ref={refFn}>
      <clipPath id={clip}>
        <circle r={r} />
      </clipPath>
      <circle r={r} fill="var(--color-surface-2)" />
      <text textAnchor="middle" dominantBaseline="central" fontSize={r * 0.6} fontWeight={700} fill="var(--color-muted)">
        {getMember(ffuId)?.abbreviation ?? ''}
      </text>
      <image href={`/team-logos/${ffuId}.png`} x={-r} y={-r} width={r * 2} height={r * 2} clipPath={`url(#${clip})`} preserveAspectRatio="xMidYMid slice" />
      <circle r={r} fill="none" stroke={`var(--color-${tier.toLowerCase()})`} strokeWidth={3} />
    </g>
  )
}

export function MarbleRaceView({ race, teams, speed = 1, onDone }: {
  race: MarbleRace
  teams: Map<string, BowlSlot>
  speed?: number
  onDone?: () => void
}) {
  const { recording, course, teamOf } = race
  const svg = useRef<SVGSVGElement>(null)
  const marbles = useRef<(SVGGElement | null)[]>([])
  const [boardFrame, setBoardFrame] = useState(0)

  useEffect(() => {
    let raf = 0
    let cam = 0
    const start = performance.now()
    const tick = (now: number) => {
      const frame = Math.min(recording.frames - 1, Math.floor(((now - start) / 1000) * FPS * speed))
      marbles.current.forEach((el, i) => {
        const p = positionAt(recording, frame, i)
        el?.setAttribute('transform', `translate(${p.x} ${p.y})`)
      })
      // Ease towards the leader rather than snapping, so lead changes don't jolt the picture.
      const target = cameraTop(recording, frame, course.finishY, VIEW_H, course.height)
      cam = frame === 0 ? target : cam + (target - cam) * 0.08
      svg.current?.setAttribute('viewBox', `0 ${cam} ${course.width} ${VIEW_H}`)
      if (frame % BOARD_EVERY === 0 || frame === recording.frames - 1) setBoardFrame(frame)
      if (frame < recording.frames - 1) raf = requestAnimationFrame(tick)
      else onDone?.()
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [recording, course, speed, onDone])

  const order = standingsAt(recording, boardFrame).map((i) => teams.get(teamOf[i]!)!)
  const finished = recording.finishFrame.filter((f) => f >= 0 && f <= boardFrame).length

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
      <svg ref={svg} viewBox={`0 0 ${course.width} ${VIEW_H}`} className="w-full border border-border bg-surface" role="img" aria-label="Marble race">
        <CourseLayer course={course} />
        {teamOf.map((ffuId, i) => (
          <Marble
            key={ffuId}
            ffuId={ffuId}
            tier={teams.get(ffuId)?.tier ?? 'NATIONAL'}
            r={course.marbleRadius}
            refFn={(el) => {
              marbles.current[i] = el
            }}
          />
        ))}
      </svg>
      <RaceLeaderboard order={order} finished={finished} />
    </div>
  )
}
