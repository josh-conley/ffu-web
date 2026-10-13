import { useMemo } from 'react'
import type { SeasonData } from '@/data'
import { formGoingInto, type TeamForm } from '@/selectors'

export type FormOf = (ffuId: string, week: number) => TeamForm | undefined

/**
 * Each team's record and UPR going into each of `weeks` (formGoingInto) over one year's seasons,
 * worked out once per week: a bracket asks for every team in every round. A week not listed has
 * no form.
 */
export function useFormGoingInto(seasons: readonly SeasonData[], weeks: readonly number[]): FormOf {
  const key = weeks.join(',')
  return useMemo(() => {
    const byWeek = new Map(key.split(',').filter(Boolean).map((w) => [Number(w), formGoingInto(seasons, Number(w))]))
    return (ffuId, week) => byWeek.get(week)?.get(ffuId)
  }, [seasons, key])
}
