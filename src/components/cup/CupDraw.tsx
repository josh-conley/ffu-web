import type { ReactNode } from 'react'
import { FaCircleInfo } from 'react-icons/fa6'
import { CUP_ACCENT } from '@/config'

// The draw + seeding rules, as adopted. Prose, not logic: the draw is conducted by the commissioner
// and its RESULT is what gets stored (participants + their seeds in the season's tournament.json).

/** A numbered step of the draw. */
function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-xs font-extrabold text-white"
        style={{ backgroundColor: CUP_ACCENT }}
        aria-hidden
      >
        {n}
      </span>
      <div className="space-y-1">
        <h3 className="text-sm font-bold uppercase tracking-wide">{title}</h3>
        <p className="max-w-3xl text-sm text-muted">{children}</p>
      </div>
    </li>
  )
}

function Callout({ children }: { children: ReactNode }) {
  return (
    <p className="flex max-w-3xl gap-2 border-l-2 bg-surface-2 px-3 py-2 text-sm text-muted" style={{ borderColor: CUP_ACCENT }}>
      <FaCircleInfo className="mt-0.5 shrink-0" aria-hidden style={{ color: CUP_ACCENT }} />
      <span>{children}</span>
    </p>
  )
}

export function CupDraw() {
  return (
    <div className="space-y-5">
      <ol className="space-y-4">
        <Step n={1} title="Premier draws first">
          Premier teams draw in draft order, 1 through 12. Each draws its first-round opponent at random from a
          single pool of all 24 Masters and National teams.
        </Step>
        <Step n={2} title="Six from each league">
          The opening round must produce six Premier–Masters ties and six Premier–National ties. As soon as six
          teams from one league have been drawn, the pool narrows to the other league for everyone still to draw.
        </Step>
        <Step n={3} title="Masters draws the rest">
          The six Masters teams left undrawn take seeds 13–18 by draft order, and each draws one of the six
          remaining National teams at random.
        </Step>
        <Step n={4} title="Seeding falls out of the draw">
          The eighteen drawing teams are seeded by draft order — Premier 1–12, then the remaining Masters teams
          13–18. Every team that gets drawn is seeded in reverse order of selection: the first team drawn is the
          36 seed, the next 35, and so on down to 19.
        </Step>
      </ol>
      <Callout>
        Say nine Premier teams have drawn, and six of those nine came out National. The National side is
        full, so Premier 10, 11 and 12 draw from the nine Masters teams still in the pool.
      </Callout>
      <Callout>
        Because Premier only ever draws Masters or National, and the leftover Masters teams only ever draw
        National, no two teams from the same league can meet in the Round of 36.
      </Callout>
    </div>
  )
}
