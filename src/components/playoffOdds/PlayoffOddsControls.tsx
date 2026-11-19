import type { OddsFormat } from '@/selectors'
import { SELECT, segButton } from '../controls'
import { yearSpan } from '../format'

export type OddsMode = 'record' | 'upr'

const MODES: [OddsMode, string][] = [
  ['record', 'By record'],
  ['upr', 'By UPR'],
]

/** The page's controls: what the odds are by, after how many games, and which seasons. */
export function PlayoffOddsControls({
  mode,
  onMode,
  games,
  onGames,
  minGames,
  maxGames,
  latestWeek,
  others,
  includeOthers,
  onIncludeOthers,
}: {
  mode: OddsMode
  onMode: (mode: OddsMode) => void
  games: number
  onGames: (games: number) => void
  minGames: number
  maxGames: number
  latestWeek: number | undefined
  /** The shorter season formats the toggle pools in; no toggle when there are none. */
  others: OddsFormat[]
  includeOthers: boolean
  onIncludeOthers: (include: boolean) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex" role="group" aria-label="Odds by">
        {MODES.map(([value, label]) => (
          <button key={value} type="button" aria-pressed={mode === value} className={segButton(mode === value)} onClick={() => onMode(value)}>
            {label}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <span className="text-muted">After</span>
        <select className={SELECT} value={String(games)} onChange={(e) => onGames(Number(e.target.value))}>
          {Array.from({ length: maxGames - minGames + 1 }, (_, i) => minGames + i).map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? 'game' : 'games'}
              {n === latestWeek ? ' (now)' : ''}
            </option>
          ))}
        </select>
      </label>
      {others.length > 0 && (
        <button
          type="button"
          aria-pressed={includeOthers}
          className={segButton(includeOthers)}
          onClick={() => onIncludeOthers(!includeOthers)}
        >
          Include {others.map(yearSpan).join(', ')}
        </button>
      )}
    </div>
  )
}
