import { useMemo, useState } from 'react'
import { CUP_ACCENT, CUP_YEAR } from '@/config'
import { useCupField } from '@/hooks/useCupField'
import { drawCup } from '@/lib/cupDraw.mjs'
import { SEED_PATTERN } from '@/lib/drawSheet.mjs'
import { raceFor, type MarbleRace } from '@/lib/marbleRace/race'
import { bowlAfter, eligibleForSpin } from '@/selectors'
import { MarbleRaceView } from '@/components/cup/marbles/MarbleRaceView'
import { BUTTON, SELECT } from '@/components/controls'
import { ErrorMessage } from '@/components/ErrorMessage'
import { LoadingSpinner } from '@/components/LoadingSpinner'

// PROTOTYPE (route /cup/draw/marbles, unlisted): the marble race as an alternative to the reel, to
// judge before deciding whether it replaces it on draw night. It uses the real field and the real
// drawCup result — pick a seed and a matchup, and the race is run for that matchup's actual pool
// and actual drawn team.

export function CupMarbles() {
  const { field, loading, problem } = useCupField(CUP_YEAR)
  const [seed, setSeed] = useState('4471')
  const [matchup, setMatchup] = useState(1)
  const [speed, setSpeed] = useState(1)
  const [race, setRace] = useState<{ race: MarbleRace; run: number } | null>(null)
  const [building, setBuilding] = useState(false)

  const setup = useMemo(() => {
    if (!field || !SEED_PATTERN.test(seed)) return undefined
    const result = drawCup(field, seed)
    const pool = eligibleForSpin(bowlAfter(field, result, matchup - 1))
    return { pool, winnerId: result.matchups[matchup - 1]!.b, teams: new Map(pool.map((t) => [t.ffuId, t])) }
  }, [field, seed, matchup])

  if (loading) return <LoadingSpinner />
  if (problem !== undefined || field === undefined) return <ErrorMessage error={problem ?? 'No field.'} />

  const start = () => {
    if (!setup) return
    setBuilding(true)
    // Let "Building…" paint before the simulation holds the main thread (~0.5s for 24 marbles).
    window.setTimeout(() => {
      setRace((prev) => ({ race: raceFor(setup.pool.map((t) => t.ffuId), setup.winnerId, seed, matchup - 1), run: (prev?.run ?? 0) + 1 }))
      setBuilding(false)
    }, 30)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 pb-2" style={{ borderColor: CUP_ACCENT }}>
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">Marble race · prototype</h1>
        <p className="max-w-xl text-xs text-muted">
          The seed picks the team; the race acts it out. Blank marbles race first (real physics, nothing nudged), then the
          drawn team&apos;s crest goes on the marble that won, and the recorded race is replayed.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-bold uppercase tracking-widest text-muted">
          Seed{' '}
          <input value={seed} onChange={(e) => setSeed(e.target.value.trim())} className={`${SELECT} ml-1 w-40 font-mono`} />
        </label>
        <label className="text-xs font-bold uppercase tracking-widest text-muted">
          Matchup{' '}
          <select value={matchup} onChange={(e) => setMatchup(Number(e.target.value))} className={`${SELECT} ml-1`}>
            {Array.from({ length: 18 }, (_, i) => (
              <option key={i} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold uppercase tracking-widest text-muted">
          Speed{' '}
          <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className={`${SELECT} ml-1`}>
            {[1, 1.25, 1.5, 2].map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={BUTTON} onClick={start} disabled={!setup || building}>
          {building ? 'Building…' : race ? 'Race again' : 'Race'}
        </button>
        {setup && <span className="text-xs text-muted">{setup.pool.length} marbles</span>}
      </div>
      {race && setup && <MarbleRaceView key={race.run} race={race.race} teams={setup.teams} speed={speed} />}
    </div>
  )
}
