import type { IconType } from 'react-icons'
import { FaAward, FaGem, FaMedal, FaToilet, FaTrophy } from 'react-icons/fa6'
import { TbPennantFilled } from 'react-icons/tb'
import { isLastPlaceFinish, type SeasonFinish } from '@/selectors'

// The icon for each kind of season finish, in one place: the Stats page's finish columns, the
// trophy case and the Compare view all draw the same trophy for the same thing. Each icon is
// colored by the league the finish came in, at the call site (LEAGUE_STYLES[tier].text).

export type HardwareKind = 'title' | 'second' | 'third' | 'pennant' | 'last'

export interface Hardware {
  icon: IconType
  /** "Champion", for tooltips and labels. */
  label: string
  /** Which finishes earn it. */
  match: (f: SeasonFinish) => boolean
}

export const HARDWARE: Record<HardwareKind, Hardware> = {
  title: { icon: FaTrophy, label: 'Champion', match: (f) => f.finalPlacement === 1 },
  second: { icon: FaMedal, label: 'Runner-up', match: (f) => f.finalPlacement === 2 },
  third: { icon: FaAward, label: 'Third place', match: (f) => f.finalPlacement === 3 },
  pennant: { icon: TbPennantFilled, label: 'Division winner', match: (f) => f.wonDivision },
  last: { icon: FaToilet, label: 'Last place', match: isLastPlaceFinish },
}

/**
 * The FFU Cup's hardware: the amendment's "diamond in the trophy case". Separate from HARDWARE
 * because a Cup win is not a league finish; drawn in the Cup's own color (CUP_ACCENT), not a tier's.
 */
export const CUP_HARDWARE = { icon: FaGem, label: 'FFU Cup champion' } as const
