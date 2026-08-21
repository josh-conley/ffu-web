import { useState, type FormEvent } from 'react'
import { CUP_ACCENT, CUP_NAME, CUP_YEAR } from '@/config'
import { SELECT } from '../../controls'

/**
 * Seed entry. The seed is the whole verifiability story, so this screen exists to make entering it
 * a deliberate, on-camera act: type in the number the audience just watched being produced, and
 * every later step follows from it. Nothing here is random — the draw is a function of this value.
 */
export function DrawSetup({ onStart }: { onStart: (seed: string) => void }) {
  const [seed, setSeed] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = seed.trim()
    if (trimmed !== '') onStart(trimmed)
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">{CUP_NAME} Draw · {CUP_YEAR}</h1>
        <p className="text-sm text-muted">
          Enter the seed the room just agreed on — dice on camera, a number called out in chat, tonight&apos;s
          scoreboard. Anything nobody could have known in advance.
        </p>
      </div>

      <ol className="space-y-2 border-l-2 pl-4 text-sm text-muted" style={{ borderColor: CUP_ACCENT }}>
        <li>The draw is a pure function of this seed — the same number always produces the same bracket.</li>
        <li>Say it out loud and leave it on screen, so the recording proves it was fixed before a single tie.</li>
        <li>
          Afterwards, <code className="font-mono text-text">npm run draw-cup -- --seed {seed.trim() || '…'}</code>{' '}
          reproduces it exactly and writes the official file.
        </li>
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="cup-seed" className="text-xs font-bold uppercase tracking-widest text-muted">
          Draw seed
        </label>
        <input
          id="cup-seed"
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          placeholder="e.g. 4471"
          autoComplete="off"
          className={`${SELECT} w-48 font-mono`}
        />
        <button
          type="submit"
          disabled={seed.trim() === ''}
          className="min-h-11 border px-5 py-1.5 text-sm font-extrabold uppercase tracking-wide text-white transition-opacity disabled:opacity-40 md:min-h-0"
          style={{ backgroundColor: CUP_ACCENT, borderColor: CUP_ACCENT }}
        >
          Begin the draw
        </button>
      </div>
    </form>
  )
}
