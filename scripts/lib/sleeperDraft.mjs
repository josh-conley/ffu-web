// Pure Sleeper → FFU mapping for a COMPLETED draft. No I/O, unit-tested in sleeperDraft.test.mjs.
//
// Twin of the client-side mapping in src/data/liveDrafts.ts, which does the same job at request
// time for a draft still in progress. The two must agree, or a board would change shape the moment
// it was backfilled — so `npm run backfill-drafts -- --verify <year>` rebuilds a completed year from
// Sleeper and diffs it against the migrated file. Run it after touching either side.

const fullName = (m) => [m?.first_name, m?.last_name].filter(Boolean).join(' ')

/** The most recently created draft for a league — Sleeper returns an array (mocks/redrafts add rows). */
export function latestDraft(drafts) {
  return drafts.reduce((best, d) => (!best || d.created > best.created ? d : best), undefined)
}

/**
 * `{ sleeperUserId: slot }` → `{ ffuId: slot }`. Throws on an unmapped account: unlike the live
 * board, which keeps a stranger's slot so the order still renders, a file written to disk should
 * not record a hole. Fix the registry and re-run.
 */
export function toDraftOrder(order, members, tier) {
  const out = {}
  const unmapped = []
  for (const [sleeperId, slot] of Object.entries(order ?? {})) {
    const member = members.get(String(sleeperId))
    if (!member) unmapped.push(`slot ${slot} (user ${sleeperId})`)
    else out[member.ffuId] = slot
  }
  if (unmapped.length > 0) throw new Error(`${tier} draft order has accounts not in members.ts:\n    ${unmapped.join('\n    ')}`)
  return out
}

/**
 * Sleeper picks → `DraftPick[]`, the same shape the migrated boards use.
 *
 * `picked_by` is the DRAFTING account, so a traded pick attributes to whoever actually made it —
 * matching the backfilled data. `players` is Sleeper's full player directory, used only to add the
 * college/age the pick payload doesn't carry; a player missing from it still yields a valid pick,
 * just without those two optional fields.
 */
export function toPicks(picks, members, players, tier) {
  const unmapped = new Set()
  const out = picks
    .map((p) => {
      const member = members.get(String(p.picked_by))
      if (!member) unmapped.add(String(p.picked_by))
      const extra = players?.[String(p.player_id)]
      return {
        overall: p.pick_no,
        round: p.round,
        slot: p.draft_slot,
        memberId: member?.ffuId ?? '',
        player: {
          id: String(p.player_id),
          name: fullName(p.metadata) || String(p.player_id),
          position: p.metadata?.position ?? '',
          ...(p.metadata?.team ? { nflTeam: p.metadata.team } : {}),
          ...(extra?.college ? { college: extra.college } : {}),
          ...(typeof extra?.age === 'number' ? { age: extra.age } : {}),
        },
      }
    })
    .sort((a, b) => a.overall - b.overall)

  if (unmapped.size > 0) throw new Error(`${tier} draft has picks by accounts not in members.ts: ${[...unmapped].join(', ')}`)
  return out
}

/** The whole file for one tier. `type` is narrowed to the DraftType union the app declares. */
export function toDraftData({ tier, year, draft, picks, members, players, schemaVersion }) {
  const TYPES = ['snake', 'auction', 'linear']
  return {
    schemaVersion,
    tier,
    year,
    draftId: String(draft.draft_id),
    type: TYPES.includes(draft.type) ? draft.type : 'unknown',
    rounds: draft.settings?.rounds ?? 0,
    draftOrder: toDraftOrder(draft.draft_order, members, tier),
    picks: toPicks(picks, members, players, tier),
  }
}
