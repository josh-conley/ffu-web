import type { ThemeId } from '../registry'
import { arcade } from './arcade'
import { christmas } from './christmas'
import { comic } from './comic'
import { halloween } from './halloween'
import { matrix } from './matrix'
import { newspaper } from './newspaper'
import { thanksgiving } from './thanksgiving'
import type { Voice } from './types'
import { xp } from './xp'

/** Every skin's voice. The standard light and dark looks are silent. */
export const VOICES: Partial<Record<ThemeId, Voice>> = { xp, arcade, matrix, comic, newspaper, halloween, thanksgiving, christmas }
