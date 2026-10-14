import { useMemo, useState } from 'react'
import { nameForYear } from '@/config'
import type { Tier } from '@/config/types'
import type { SeasonData } from '@/data'
import { pickedChampion, type PickRound, type PickSlot } from '@/lib/cupPickem'
import type { PickOutcome } from '@/selectors'
import { useFormGoingInto } from '@/hooks/useFormGoingInto'
import { BracketFrame, RoundShell } from '../../TournamentBracket'
import { TournamentMatchupCard, type CardSide } from '../../TournamentMatchupCard'
import { uprLabel } from '../../format'
import { ChampionBanner } from '../CupBracketPanel'
import { DropPick } from './PickemBracketParts'
import { PickemMatchupModal } from './PickemMatchupModal'

// A pick'em bracket, drawn with the Cup bracket's own pieces (frame, round columns, matchup cards,
// champion banner), so it reads as the same bracket: the pick shows as a game's winner does. Tap a
// matchup to open it (the season so far, both rosters, and a Pick button under each team while
// filling one in). Read-only on the leaderboard, where a pick that won or lost is marked so.

export interface PickemBracketProps {
  bracket: PickRound[]
  year: string
  tierOf: ReadonlyMap<string, Tier>
  /** The Cup season's league files: each team's UPR under its name, and the modal's figures. */
  seasons: SeasonData[]
  /** Omit for a read-only bracket. */
  onPick?: (roundKey: string, index: number, ffuId: string) => void
  onDrop?: (roundKey: string, ffuId: string) => void
  outcomes?: Record<string, (PickOutcome | undefined)[]>
}

/** The picked row: tinted whole, in the Cup's blue. Once its round is played, the text says how it went. */
const PICK_TONE = 'border-pick-edge bg-pick py-0.5 pr-1'
const OUTCOME_TEXT: Record<PickOutcome, string> = {
  won: 'text-positive',
  lost: 'text-negative line-through',
  pending: '',
}

interface Opened {
  roundKey: string
  index: number
}

const sideOf = (id: string | undefined, tierOf: ReadonlyMap<string, Tier>): CardSide =>
  id === undefined ? undefined : { ffuId: id, tier: tierOf.get(id) ?? 'NATIONAL' }

function cardLabel(slot: PickSlot, year: string): string | undefined {
  if (slot.a === undefined || slot.b === undefined) return undefined
  return `${nameForYear(slot.a, year) ?? slot.a} v ${nameForYear(slot.b, year) ?? slot.b}`
}

export function PickemBracket({ bracket, year, tierOf, seasons, onPick, onDrop, outcomes }: PickemBracketProps) {
  const [opened, setOpened] = useState<Opened>()
  const weeks = useMemo(() => bracket.map((r) => r.week), [bracket])
  const formOf = useFormGoingInto(seasons, weeks)
  const champion = pickedChampion(bracket)
  const round = opened && bracket.find((r) => r.key === opened.roundKey)
  const slot = opened && round?.slots[opened.index]

  return (
    <div className="space-y-4">
      {champion && <ChampionBanner ffuId={champion} year={year} label={onPick ? 'Your champion' : 'Picked champion'} />}
      <BracketFrame>
        {bracket.map((r, i) => (
          // The drop pick heads the round it shrinks (the quarterfinals): the field it forms is there.
          <RoundShell key={r.key} label={r.label} week={r.week} note={bracket[i - 1]?.needsDrop && <DropPick round={bracket[i - 1]!} year={year} onDrop={onDrop} />}>
            {r.slots.map((s, j) => {
              const known = s.a !== undefined && s.b !== undefined
              const outcome = outcomes?.[r.key]?.[j]
              return (
                <TournamentMatchupCard
                  key={j}
                  matchup={{ a: sideOf(s.a, tierOf), b: sideOf(s.b, tierOf), winner: s.pick }}
                  year={year}
                  detail={(id) => uprLabel(formOf(id, r.week))}
                  winnerTone={`${PICK_TONE} ${outcome ? OUTCOME_TEXT[outcome] : ''}`}
                  label={cardLabel(s, year)}
                  onOpen={known ? () => setOpened({ roundKey: r.key, index: j }) : undefined}
                />
              )
            })}
          </RoundShell>
        ))}
      </BracketFrame>
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
    </div>
  )
}
