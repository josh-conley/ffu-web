import { useMemo, useState } from 'react'
import { nameForYear } from '@/config'
import type { Tier } from '@/config/types'
import type { SeasonData } from '@/data'
import { pickedChampion, type PickRound, type PickSlot } from '@/lib/cupPickem'
import type { PickOutcome } from '@/selectors'
import { useFormGoingInto } from '@/hooks/useFormGoingInto'
import { TournamentMatchupCard, type CardSide } from '../../TournamentMatchupCard'
import { WingedBracket } from '../../WingedBracket'
import { uprLabel } from '../../format'
import { ChampionBanner } from '../CupBracketPanel'
import { DropPick } from './PickemBracketParts'
import { PickemMatchupModal } from './PickemMatchupModal'

// A pick'em bracket, drawn with the Cup bracket's own pieces (two-sided frame, matchup cards,
// champion banner), so it reads as the same bracket: the pick shows as a game's winner does. Tap a
// matchup to open it (the season so far, both rosters, and a Pick button under each team while
// filling one in). Read-only on the leaderboard, where a pick that won or lost is marked so.

export interface PickemBracketProps {
  bracket: PickRound[]
  year: string
  tierOf: ReadonlyMap<string, Tier>
  /** Each team's seed from the draw, shown before its name. */
  seedOf: ReadonlyMap<string, number>
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

type SideOf = (id: string | undefined) => CardSide

function cardLabel(slot: PickSlot, year: string): string | undefined {
  if (slot.a === undefined || slot.b === undefined) return undefined
  return `${nameForYear(slot.a, year) ?? slot.a} v ${nameForYear(slot.b, year) ?? slot.b}`
}

/** One game: the pick shows as its winner, tinted, and once played marked as won or lost. */
function PickCard({ slot, year, sideOf, outcome, detail, onOpen }: {
  slot: PickSlot
  year: string
  sideOf: SideOf
  outcome: PickOutcome | undefined
  detail: (ffuId: string) => string | undefined
  onOpen: (() => void) | undefined
}) {
  return (
    <TournamentMatchupCard
      matchup={{ a: sideOf(slot.a), b: sideOf(slot.b), winner: slot.pick }}
      year={year}
      detail={detail}
      winnerTone={`${PICK_TONE} ${outcome ? OUTCOME_TEXT[outcome] : ''}`}
      label={cardLabel(slot, year)}
      onOpen={onOpen}
    />
  )
}

export function PickemBracket({ bracket, year, tierOf, seedOf, seasons, onPick, onDrop, outcomes }: PickemBracketProps) {
  const [opened, setOpened] = useState<Opened>()
  const weeks = useMemo(() => bracket.map((r) => r.week), [bracket])
  const formOf = useFormGoingInto(seasons, weeks)
  const champion = pickedChampion(bracket)
  const round = opened && bracket.find((r) => r.key === opened.roundKey)
  const slot = opened && round?.slots[opened.index]
  const sideOf: SideOf = (id) => (id === undefined ? undefined : { ffuId: id, tier: tierOf.get(id) ?? 'NATIONAL', seed: seedOf.get(id) })
  const card = (r: PickRound, s: PickSlot, j: number) => (
    <PickCard key={j} slot={s} year={year} sideOf={sideOf} outcome={outcomes?.[r.key]?.[j]}
      detail={(id) => uprLabel(formOf(id, r.week))}
      onOpen={s.a !== undefined && s.b !== undefined ? () => setOpened({ roundKey: r.key, index: j }) : undefined} />
  )

  return (
    <div className="space-y-4">
      {champion && <ChampionBanner ffuId={champion} year={year} label={onPick ? 'Your champion' : 'Picked champion'} />}
      <WingedBracket
        label="Pick'em bracket"
        // The drop pick shapes the quarterfinals across both sides, so it sits over the final.
        center={bracket.filter((r) => r.needsDrop).map((r) => <DropPick key={r.key} round={r} year={year} onDrop={onDrop} />)}
        rounds={bracket.map((r) => ({ key: r.key, label: r.label, week: r.week, slots: r.slots.map((s, j) => card(r, s, j)) }))}
      />
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
