import { useMemo, useRef } from 'react'
import { CUP_ACCENT, CUP_NAME, CUP_YEAR } from '@/config'
import type { SeasonData } from '@/data'
import { drawCommand } from '@/lib/drawSheet.mjs'
import { matchupStory, matchupTag } from '@/selectors'
import { CopyImageButton } from '../../CopyImageButton'
import { BUTTON } from '../../controls'
import { LEAGUE_STYLES } from '../../leagues'
import { TeamLogo } from '../../TeamLogo'
import type { LedgerMatchup } from './DrawLedger'
import type { MatchupSide } from './DrawMatchupCard'

// The end of the draw: all 18 matchups in one screenshot-ready block — the stream's closing shot
// and the FFUN's write-up — then what the operator does next. The downloads live here and ONLY
// here: offered mid-draw, one stray click put the whole unrevealed bracket in the download bar.

function Team({ side, align }: { side: MatchupSide; align: 'start' | 'end' }) {
  return (
    <span className={`flex min-w-0 flex-1 items-center gap-2 ${align === 'end' ? 'flex-row-reverse text-right' : ''}`}>
      <TeamLogo ffuId={side.ffuId} size={28} clickable={false} />
      <span className="min-w-0">
        <span className="block truncate font-bold">{side.name}</span>
        <span className={`block text-[11px] font-bold uppercase tracking-widest ${LEAGUE_STYLES[side.tier].text}`}>
          {LEAGUE_STYLES[side.tier].label} · {side.seed}
        </span>
      </span>
    </span>
  )
}

function Row({ n, matchup, tag }: { n: number; matchup: LedgerMatchup; tag: string | undefined }) {
  return (
    <li className="flex items-center gap-3 border border-border bg-surface px-3 py-2 text-sm">
      <span className="w-5 shrink-0 text-right font-mono font-bold tabular-nums text-muted">{n}</span>
      <Team side={matchup.a} align="start" />
      <span className="shrink-0 text-xs font-bold uppercase text-muted">v</span>
      <Team side={matchup.b} align="end" />
      {tag && <span className="hidden w-32 shrink-0 text-right text-xs font-bold uppercase tracking-wide text-muted sm:block">{tag}</span>}
    </li>
  )
}

export function DrawComplete({ seed, checkCode, matchups, seasons, onDownload }: {
  seed: string
  checkCode: string
  matchups: LedgerMatchup[]
  /** Completed seasons, for each row's head-to-head tag. Empty just drops the tags. */
  seasons: SeasonData[]
  onDownload: (kind: 'txt' | 'csv') => void
}) {
  const panel = useRef<HTMLDivElement>(null)
  const tags = useMemo(
    () => (seasons.length > 0 ? matchups.map((m) => matchupTag(matchupStory(seasons, m.a.ffuId, m.b.ffuId))) : []),
    [seasons, matchups],
  )

  return (
    <section className="space-y-3" aria-label="Draw complete">
      <div ref={panel} className="space-y-3 border-2 bg-bg p-4" style={{ borderColor: CUP_ACCENT }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-extrabold uppercase tracking-tight">
            {CUP_NAME} {CUP_YEAR} · Round of 36
          </h2>
          <p className="text-xs font-bold uppercase tracking-widest text-muted">
            Seed <span className="font-mono text-sm normal-case tracking-normal text-text">{seed}</span>
            <span className="mx-2">·</span>
            Check <span className="font-mono text-sm tracking-normal text-text">{checkCode}</span>
          </p>
        </div>
        <ol className="grid gap-1.5 xl:grid-cols-2">
          {matchups.map((m, i) => (
            <Row key={i} n={i + 1} matchup={m} tag={tags[i]} />
          ))}
        </ol>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <CopyImageButton targetRef={panel} filename={`ffu-cup-draw-${CUP_YEAR}.png`} />
        <button type="button" className={BUTTON} onClick={() => onDownload('txt')}>
          Download sheet
        </button>
        <button type="button" className={BUTTON} onClick={() => onDownload('csv')}>
          CSV
        </button>
      </div>
      <p className="text-sm text-muted">
        Record the seed, then run <code className="font-mono text-text">{drawCommand(seed)}</code> to write the
        official bracket. Its sheet prints a check code: it must read <span className="font-mono text-text">{checkCode}</span>.
      </p>
    </section>
  )
}
