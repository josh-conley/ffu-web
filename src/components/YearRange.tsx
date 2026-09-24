import { DualRangeSlider } from './DualRangeSlider'

/** Year range — a two-knob slider restricting a view to a span of seasons (Builds, All-Time Stats). */
export function YearRange({
  years,
  fromYear,
  toYear,
  onFrom,
  onTo,
}: {
  years: string[]
  fromYear: string
  toYear: string
  onFrom: (v: string) => void
  onTo: (v: string) => void
}) {
  return (
    <DualRangeSlider
      label="Years"
      min={Number(years[0] ?? 0)}
      max={Number(years.at(-1) ?? 0)}
      from={Number(fromYear)}
      to={Number(toYear)}
      onFrom={(n) => onFrom(String(n))}
      onTo={(n) => onTo(String(n))}
      format={String}
    />
  )
}
