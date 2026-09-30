import { CUP_ACCENT, CUP_NAME } from '@/config'
import { TOTAL_MATCHUPS } from '@/hooks/useCupDrawReveal'

// The strip across the top of the stage. The seed is the proof the draw was fixed up front, so it
// is shown large and EXACTLY as typed: the strip used to be `uppercase`, which put "WEEK4 SNF 51"
// on camera for a seed of "week4 SNF 51" — and the draw is case-sensitive, so re-running what the
// stream showed would have produced a different bracket.

export function DrawTopBar({ seed, matchupNumber, done }: { seed: string; matchupNumber: number; done: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 pb-2" style={{ borderColor: CUP_ACCENT }}>
      <h1 className="text-2xl font-extrabold uppercase tracking-tight sm:text-3xl">{CUP_NAME} Draw</h1>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <span className="text-sm font-bold uppercase tracking-widest text-muted">
          Seed <span className="font-mono text-xl normal-case tracking-normal text-text">{seed}</span>
        </span>
        <span className="text-sm font-bold uppercase tracking-widest" style={{ color: CUP_ACCENT }}>
          {done ? 'Complete' : `Matchup ${matchupNumber} of ${TOTAL_MATCHUPS}`}
        </span>
      </div>
    </div>
  )
}
