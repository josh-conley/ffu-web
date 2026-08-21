import { useState } from 'react'
import { CUP_YEAR } from '@/config'
import { useCupField } from '@/hooks/useCupField'
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

export function CupDraw() {
  const { field, loading, problem } = useCupField(CUP_YEAR)
  const [seed, setSeed] = useState<string | null>(null)

  if (loading) return <LoadingSpinner />
  if (problem !== undefined || field === undefined) {
    return <ErrorMessage error={problem ?? `No field available for ${CUP_YEAR}.`} />
  }
  if (seed === null) return <DrawSetup onStart={setSeed} />
  return <DrawStage field={field} seed={seed} onRestart={() => setSeed(null)} />
}
