import { useState } from 'react'
import { FaTrophy, FaMedal, FaAward } from 'react-icons/fa6'
import type { CareerStats, SeasonFinish } from '@/selectors'
import { LEAGUE_STYLES } from './leagues'

/** Empty-state banter — one is drawn at random each time an empty trophy case is shown. */
const EMPTY_LINES = [
  'No trophies. Just vibes.',
  'Echoes in here.',
  'Polished shelves. Nothing to put on them.',
  'Maybe next year. (They said that last year, too.)',
  'Zero trophies, but a great personality.',
  'Still waiting on its first tenant.',
  'Banner pending. Indefinitely.',
  'This shelf has never known weight.',
  'Dust: 1. Trophies: 0.',
  'All case, no trophy.',
  'Cobwebs remain undefeated.',
  'A museum of what could have been.',
  'Participation trophies don’t count.',
  'The trophies are in another castle.',
  'Future home of a trophy (citation needed).',
  'Rings? Never heard of them.',
  'Sponsored by moral victories.',
  'The case stays climate-controlled for no reason at all.',
  'Glass cleaned weekly. Optimism, annually.',
  'Currently exhibiting: nothing.',
  'Hardware store says the shipment is still delayed.',
  'You miss 100% of the championships you don’t win.',
  'Trophy case purchased in 2018. Still in original packaging.',
  'Open concept. Very open.',
  'Minimalist by necessity, not by choice.',
  'The shelf is load-tested and ready whenever you are.',
  'Somehow still undefeated at coming up short.',
  'Trust the process. The process is taking a while.',
  'The drought is now old enough to start school.',
  'Even the dust is embarrassed.',
  'Great lighting. Nothing to shine it on.',
  'This space intentionally left blank.',
  'Award-winning? No. Award-adjacent? Also no.',
  'Has watched every championship from the couch.',
  'The hardware is hypothetical at this time.',
  'Confetti budget: untouched since inception.',
  'Their best finish is technically a finish.',
  'A proud history of almost.',
  'Fourth place is just first place of the losers’ bracket.',
  'The case echoes when you close it.',
  'No rings. Plenty of hot takes.',
  'Running a long-term rebuild. Very long-term.',
  'Their dynasty is still in the prologue.',
  'Statistically due any decade now.',
  'The shelf gets dusted more than it gets used.',
  'Carried by vibes, betrayed by lineups.',
  'Plenty of room for activities in here.',
  'The trophy fund accrues interest, untouched.',
  'Draft-day champion. Regular-season participant.',
  'Their banner is still at the printer (they never sent it).',
  'Schrödinger’s contender: simultaneously rebuilding and all-in.',
  'Home of the league’s most consistent fifth place.',
  'They peaked in the group chat.',
  'The victory speech remains in drafts.',
  'Hall of Fame of Hanging Around.',
  'Has never had to budget for ring sizing.',
  'The case is a metaphor at this point.',
  'Always a bridesmaid. Sometimes not even invited.',
  'Mathematically eliminated, spiritually undeterred.',
  'Big trade-deadline energy. Small trophy-case energy.',
  'Their championship window is painted shut.',
  'Waivers won. Titles, not so much.',
  'The only hardware here is the shelf brackets.',
  'Moths pay rent now.',
  'Preseason favorite. Postseason spectator.',
  'Voted Most Likely To, eight years running.',
  'It’s not a rebuild if it never ends.',
  'The trophy case identifies as decorative.',
  'Locked, for the safety of absolutely nothing.',
  'Their best ability is availability. For next season.',
  'Championship DNA, pending lab results.',
  'A cautionary tale with great uniforms.',
  'The shelf life of hope: apparently infinite.',
  'Still tweaking the lineup that would have won it all.',
  'Legend has it a trophy was once nearby.',
]

const randomEmptyLine = () => EMPTY_LINES[Math.floor(Math.random() * EMPTY_LINES.length)]

const HARDWARE = {
  1: { icon: FaTrophy, ordinal: '1st', label: 'Champion' },
  2: { icon: FaMedal, ordinal: '2nd', label: 'Runner-up' },
  3: { icon: FaAward, ordinal: '3rd', label: 'Third place' },
} as const

function isTrophy(f: SeasonFinish): f is SeasonFinish & { finalPlacement: 1 | 2 | 3 } {
  return f.finalPlacement !== null && f.finalPlacement <= 3
}

/** Top-3 finishes as tier-colored chips — icon + ordinal + year (champion → runner-up → third,
 *  then by year). Shared by the team-profile modal and the Members detail page. */
export function TrophyCase({ career }: { career: CareerStats }) {
  const [emptyLine] = useState(randomEmptyLine)
  const trophies = career.finishes
    .filter(isTrophy)
    .sort((a, b) => a.finalPlacement - b.finalPlacement || a.year.localeCompare(b.year))
  if (trophies.length === 0) return <p className="text-xs italic text-muted">{emptyLine}</p>
  return (
    <div className="flex flex-wrap gap-1.5">
      {trophies.map((f) => {
        const { icon: Icon, ordinal, label } = HARDWARE[f.finalPlacement]
        return (
          <span key={`${f.year}-${f.tier}-${f.finalPlacement}`} title={`${LEAGUE_STYLES[f.tier].label} ${label} · ${f.year}`} className="inline-flex items-center gap-1.5 bg-surface-2 px-2 py-1 text-xs font-medium tabular-nums ring-1 ring-border">
            <Icon size={12} className={LEAGUE_STYLES[f.tier].text} aria-hidden />
            <span className={`font-semibold ${LEAGUE_STYLES[f.tier].text}`}>{ordinal}</span>
            <span className="text-muted">{f.year}</span>
          </span>
        )
      })}
    </div>
  )
}
