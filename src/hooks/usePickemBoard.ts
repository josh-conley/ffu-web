import { useCallback, useState } from 'react'
import { fetchPickemBoard } from '@/data'
import { useAsyncData } from './useAsyncData'

// The pick'em board (lock state + who has entered, + everyone's picks once locked), re-read after a
// save so the new entry shows up. The previous board stays on screen while it re-reads.

export function usePickemBoard(year: string, enabled: boolean) {
  const [version, setVersion] = useState(0)
  const state = useAsyncData(`pickem:${year}:${version}`, () => fetchPickemBoard(year), enabled, { keepPrevious: true })
  const reload = useCallback(() => setVersion((v) => v + 1), [])
  return { ...state, reload }
}
