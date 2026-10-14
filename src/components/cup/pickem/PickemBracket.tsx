import { useState } from 'react'
import type { Tier } from '@/config/types'
import type { SeasonData } from '@/data'
import { pickedChampion, type PickRound } from '@/lib/cupPickem'
import type { PickOutcome } from '@/selectors'
import { ChampionColumn, ColumnHeader, DropPick, MatchupCard } from './PickemBracketParts'
import { PickemMatchupModal } from './PickemMatchupModal'

// A pick'em bracket drawn as a bracket: one column per round, left to right, then the champion.
// Tap a matchup to open it: the season so far side by side, both rosters, and (while filling one
// in) a Pick button under each team. Read-only on the leaderboard, where each pick is marked by
// how it turned out.

export interface PickemBracketProps {
  bracket: PickRound[]
  year: string
  tierOf: ReadonlyMap<string, Tier>
  /** The Cup season's league files, for the modal's season figures. */
  seasons: SeasonData[]
  /** Omit for a read-only bracket. */
  onPick?: (roundKey: string, index: number, ffuId: string) => void
  onDrop?: (roundKey: string, ffuId: string) => void
  outcomes?: Record<string, (PickOutcome | undefined)[]>
}

interface Opened {
  roundKey: string
  index: number
}

export function PickemBracket({ bracket, year, tierOf, seasons, onPick, onDrop, outcomes }: PickemBracketProps) {
  const [opened, setOpened] = useState<Opened>()
  const round = opened && bracket.find((r) => r.key === opened.roundKey)
  const slot = opened && round?.slots[opened.index]

  return (
    <>
      {/* Full-bleed and horizontally scrollable, like the Cup's own bracket (TournamentBracket). */}
      <div className="mx-[calc(50%-50vw+1rem)]">
        <div className="mx-auto w-fit max-w-full overflow-x-auto pb-4">
          <div className="flex min-w-max items-stretch gap-4 px-1">
            {bracket.map((r) => (
              <section key={r.key} className="flex w-56 shrink-0 flex-col">
                <ColumnHeader round={r} />
                <div className="flex flex-1 flex-col justify-around gap-3">
                  {r.slots.map((s, j) => (
                    <MatchupCard key={j} slot={s} year={year} tierOf={tierOf} outcome={outcomes?.[r.key]?.[j]} onOpen={() => setOpened({ roundKey: r.key, index: j })} />
                  ))}
                </div>
                {r.needsDrop && <div className="mt-3"><DropPick round={r} year={year} onDrop={onDrop} /></div>}
              </section>
            ))}
            <ChampionColumn champion={pickedChampion(bracket)} year={year} />
          </div>
        </div>
      </div>
      {opened && round && slot?.a !== undefined && slot.b !== undefined && (
        <PickemMatchupModal
          matchup={{ a: slot.a, b: slot.b, roundLabel: round.label, pick: slot.pick }}
          year={year}
          seasons={seasons}
          tierOf={tierOf}
          onPick={onPick && ((id) => {
            onPick(opened.roundKey, opened.index, id)
            setOpened(undefined)
          })}
          onClose={() => setOpened(undefined)}
        />
      )}
    </>
  )
}
