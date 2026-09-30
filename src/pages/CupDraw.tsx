import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CUP_YEAR } from '@/config'
import { SEED_PATTERN } from '@/lib/drawSheet.mjs'
import { useCupField } from '@/hooks/useCupField'
import { useAllSeasons } from '@/hooks/useLeagueData'
import { DrawSetup } from '@/components/cup/draw/DrawSetup'
import { DrawStage } from '@/components/cup/draw/DrawStage'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

// The live, on-stream draw (route /cup/draw — deliberately NOT in the nav; it is an operator view
// for one night, not a page anyone browses to).
//
// It runs the SAME algorithm as `npm run draw-cup`: src/lib/cupDraw.mjs is imported by both, so the
// streamed draw and the CLI cannot apply different rules. What this page adds is theatre and a
// download; the seed remains the record, and the CLI still writes the official bracket.
//
// The seed and how far the draw has got live in the URL (?seed=…&at=N), not in component state:
// a reload or a crashed tab mid-stream comes back to the same matchup instead of the seed screen.
// Safe because the bracket is a pure function of the seed — resuming replays nothing.

/** The draw's place in the URL. A seed that fails the pattern is treated as no seed. */
function useDrawParams() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('seed')
  const seed = raw !== null && SEED_PATTERN.test(raw) ? raw : null
  const at = Number(params.get('at') ?? 0)

  const start = useCallback((s: string) => setParams({ seed: s }), [setParams])
  const restart = useCallback(() => setParams({}), [setParams])
  // replace, not push: every matchup would otherwise be a Back-button step.
  const progress = useCallback(
    (settled: number) => {
      if (seed !== null) setParams({ seed, at: String(settled) }, { replace: true })
    },
    [seed, setParams],
  )
  return { seed, at: Number.isFinite(at) ? at : 0, start, restart, progress }
}

export function CupDraw() {
  const { field, loading, problem } = useCupField(CUP_YEAR)
  // Every completed season, for each matchup's head-to-head story. Not fatal if it fails: the draw runs
  // regardless and simply loses the storyline.
  const { data: seasons } = useAllSeasons()
  const { seed, at, start, restart, progress } = useDrawParams()

  if (loading) return <LoadingSpinner />
  if (problem !== undefined || field === undefined) {
    return <ErrorMessage error={problem ?? `No field available for ${CUP_YEAR}.`} />
  }
  if (seed === null) return <DrawSetup onStart={start} />
  return (
    <DrawStage
      key={seed}
      field={field}
      seed={seed}
      seasons={seasons ?? []}
      resumeAt={at}
      onProgress={progress}
      onRestart={restart}
    />
  )
}
