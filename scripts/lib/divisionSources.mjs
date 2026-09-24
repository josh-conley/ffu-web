// Where the division backfills keep their inputs and output. Tracked in git (scripts/data/), unlike
// the rest of the migration inputs under gitignored legacy-source/: these can't be regenerated from
// the old ffu-app repo — the ESPN exports needed login cookies, and the supplement is what the
// backfills distilled from those exports and the Sleeper API. Without them, `npm run migrate` would
// rebuild 2018–2024 with no divisions.

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'data')

/** Division names + assignments per `year/TIER`, merged by migrate-to-v2 (applyDivisionsSupplement). */
export const DIVISIONS_SUPPLEMENT = join(DATA, 'divisions-supplement.json')

/** An offline espn-api division export for one tier, read by backfill-espn-divisions. */
export const espnDivisionsExport = (tier) => join(DATA, `espn-${tier.toLowerCase()}-divisions.json`)
