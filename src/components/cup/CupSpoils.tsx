import type { ReactElement, ReactNode } from 'react'
import { FaTrophy, FaGem, FaDiscord, FaSackDollar } from 'react-icons/fa6'
import { CUP_ACCENT, CUP_DISCORD_ROLE, getPrizeSchedule, isCupRoundKey } from '@/config'
import { cupWinnerPurse, type RoundOutline } from '@/selectors'

// What the Cup pays. Amounts come from the season's prize schedule (src/config/prizes.ts) — absent
// until the commissioner publishes them, in which case this says TBA rather than guessing.

/**
 * The Cup pays for winning AND advancing, so a round's prize is named by where it gets you — which
 * is simply the next round's name. Derived from the season's rounds rather than written out, so a
 * season that renames or drops a round can't leave a stale label behind.
 */
function prizeLabel(rounds: RoundOutline[], index: number): string {
  const next = rounds[index + 1]
  return next === undefined ? `Win the ${rounds[index]!.label}` : `Win & advance to the ${next.label}`
}

function PrizeRow({ label, amount }: { label: string; amount?: number }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border border-border bg-surface px-4 py-2.5">
      <span className="text-sm">{label}</span>
      <span className="font-mono text-sm font-bold tabular-nums">{amount === undefined ? 'TBA' : `$${amount}`}</span>
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

function Heading({ icon, children }: { icon: ReactElement; children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted">
      {icon}
      {children}
    </h3>
  )
}

export function CupSpoils({ rounds, year }: { rounds: RoundOutline[]; year: string }) {
  const cupPrizes = getPrizeSchedule(year)?.cup
  const keys = rounds.map((r) => r.key).filter(isCupRoundKey)
  const purse = cupWinnerPurse(cupPrizes, keys)

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-2">
        <Heading icon={<FaSackDollar aria-hidden />}>Paid every round</Heading>
        {rounds.map((r, i) => (
          <PrizeRow key={r.key} label={prizeLabel(rounds, i)} amount={isCupRoundKey(r.key) ? cupPrizes?.[r.key] : undefined} />
        ))}
        {purse === undefined ? (
          <p className="text-xs text-muted">Amounts are announced with the {year} prize sheet.</p>
        ) : (
          <p className="text-xs text-muted">
            Run the table and you collect <strong className="text-text">${purse}</strong>. Prizing is for winning{' '}
            <em>and</em> advancing — the Round of 18&apos;s lowest-scoring winner is eliminated, so that win does
            not pay.
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Heading icon={<FaTrophy aria-hidden />}>The winner also takes</Heading>
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
