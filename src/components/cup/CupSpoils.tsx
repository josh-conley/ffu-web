import type { ReactElement, ReactNode } from 'react'
import { FaTrophy, FaGem, FaDiscord, FaSackDollar } from 'react-icons/fa6'
import { CUP_ACCENT, CUP_DISCORD_ROLE, CUP_ROUND_RULES, getPrizeSchedule, type CupRoundKey } from '@/config'
import type { RoundOutline } from '@/selectors'

// What the Cup pays out. Amounts come from the season's prize schedule (src/config/prizes.ts) —
// absent until the commissioner publishes them, in which case this says so rather than guessing.

const isCupRoundKey = (key: string): key is CupRoundKey => key in CUP_ROUND_RULES

function PrizeRow({ round, amount }: { round: RoundOutline; amount?: number }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border border-border bg-surface px-4 py-2.5">
      <span className="text-sm font-semibold">{round.label}</span>
      <span className="font-mono text-sm tabular-nums text-muted">
        {amount === undefined ? 'TBA' : `$${amount}`}
      </span>
    </div>
  )
}

function Spoil({ icon, children }: { icon: ReactElement; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 border border-border bg-surface px-4 py-3 text-sm">
      <span className="shrink-0" style={{ color: CUP_ACCENT }} aria-hidden>{icon}</span>
      <span>{children}</span>
    </li>
  )
}

export function CupSpoils({ rounds, year }: { rounds: RoundOutline[]; year: string }) {
  const cupPrizes = getPrizeSchedule(year)?.cup
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-2">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted">
          <FaSackDollar aria-hidden /> Paid to every team that advances
        </h3>
        {rounds.map((r) => (
          <PrizeRow key={r.key} round={r} amount={isCupRoundKey(r.key) ? cupPrizes?.[r.key] : undefined} />
        ))}
        {cupPrizes === undefined && (
          <p className="text-xs text-muted">Amounts are announced with the {year} prize sheet.</p>
        )}
      </div>
      <div className="space-y-2">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted">
          <FaTrophy aria-hidden /> The winner also takes
        </h3>
        <ul className="space-y-2">
          <Spoil icon={<FaDiscord size={18} />}>
            The blue <strong>{CUP_DISCORD_ROLE}</strong> role in Discord.
          </Spoil>
          <Spoil icon={<FaGem size={18} />}>A diamond in the trophy case.</Spoil>
        </ul>
      </div>
    </div>
  )
}
