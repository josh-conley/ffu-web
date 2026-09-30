import { useState, type FormEvent } from 'react'
import { CUP_ACCENT, CUP_NAME, CUP_YEAR } from '@/config'
import { SEED_PATTERN, drawCommand } from '@/lib/drawSheet.mjs'
import { SELECT } from '../../controls'

/**
 * Seed entry. The seed is the whole verifiability story, so this screen exists to make entering it
 * a deliberate, on-camera act: type in the number the audience just watched being produced, and
 * every later step follows from it. Nothing here is random — the draw is a function of this value.
 */
export function DrawSetup({ onStart }: { onStart: (seed: string) => void }) {
  const [seed, setSeed] = useState('')

  const trimmed = seed.trim()
  const valid = SEED_PATTERN.test(trimmed)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (valid) onStart(trimmed)
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">{CUP_NAME} Draw · {CUP_YEAR}</h1>
        <p className="text-sm text-muted">
          Enter the seed you published before the draw — e.g. the combined final score of an NFL game you named in
          advance. It must be something nobody controls and nobody could have known when it was announced.
        </p>
      </div>

      <ol className="space-y-2 border-l-2 pl-4 text-sm text-muted" style={{ borderColor: CUP_ACCENT }}>
        <li>The draw is a pure function of this seed — the same number always produces the same bracket.</li>
        <li>Say it out loud and leave it on screen, so the recording proves it was fixed before a single matchup was drawn.</li>
        <li>
          Afterwards, <code className="font-mono text-text">{drawCommand(trimmed || '…')}</code> reproduces it exactly
          and writes the official file.
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
          aria-describedby="cup-seed-rule"
          aria-invalid={trimmed !== '' && !valid}
          className={`${SELECT} w-56 font-mono`}
        />
        <button
          type="submit"
          disabled={!valid}
          className="min-h-11 border px-5 py-1.5 text-sm font-extrabold uppercase tracking-wide text-white transition-opacity disabled:opacity-40 md:min-h-0"
          style={{ backgroundColor: CUP_ACCENT, borderColor: CUP_ACCENT }}
        >
          Begin the draw
        </button>
      </div>
      <p id="cup-seed-rule" className={`text-xs ${trimmed !== '' && !valid ? 'font-bold text-negative' : 'text-muted'}`}>
        Letters, digits, spaces and - _ . : # only, so the command above can be pasted into any terminal.
      </p>
    </form>
  )
}
