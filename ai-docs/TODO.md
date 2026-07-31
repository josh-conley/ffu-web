# TODO

Living task list — not a spec or a plan doc. Check things off as they're done, add items as they
come up, delete anything that's no longer relevant. Claude: keep this current as work happens;
don't let it go stale.

## 2026 season — ready for Week 1

- [x] Get 2026 Sleeper league IDs (Premier/Masters/National) from the commissioner/Sleeper app
- [x] Add those ids to `src/config/liveSeason.ts`'s `LIVE_LEAGUE_IDS['2026']` (all 3 tiers) — this
      is what turns on the live "This Week" home page section (added 2026-07-18; leagues pre_draft)
- [ ] Add any new members to `src/config/members.ts` (ffuId + `platformIds.sleeper`) — rolling task
      until the leagues fill; done 2026-07-28 for ffu-057 (YAC Attack) + ffu-058 (jimmycandles)
- [ ] Add any new owners to `src/config/owners.ts` — owner-057 (Tom) + owner-058 (Mladen) added
      2026-07-28
- [ ] Confirm returning members' `platformIds.sleeper` still match (no swapped Sleeper accounts)
      — as of 2026-07-28: every roster owner resolves to a registry member; still filling
      (Premier 11/12, Masters 8/12, National 11/12), re-check once rosters are complete. The home
      page's "2026 Leagues" section surfaces this: unmapped managers show as "not listed yet".
- [ ] Add a 2026 entry to `src/config/prizes.ts` once the commissioner posts `prizes.txt` for 2026
- [x] (Data) Backfill National 2018–2020 divisions (Bronze/Copper/Brass/Nickel) so their $10
      division-champ prizes attribute (done 2026-07-27 — pulled from ESPN league 4270 via the
      sibling `espn-api` repo; see the header of `scripts/backfill-espn-divisions.mjs` for the
      reproduction commands). Divisions were the *only* gap vs Premier for those seasons.
- [ ] Prepare a home page draft announcement section (new — see below)
- [ ] Spot-check the live "This Week" section once real ids are in, early in Week 1

## Home page — draft announcement section

- [ ] Design + build a section (likely on Overview, near the top) announcing the upcoming/live draft
      — exact content/timing TBD
- [x] "2026 Leagues" section under Upcoming Drafts: who's signed up per tier, tagged Promoted /
      Relegated / Returning / New vs the last completed season (2026-07-28). Live from Sleeper via
      `useLeagueRosters` + the `upcomingRosters` selector; disappears on its own once 2026 moves out
      of `LIVE_LEAGUE_IDS` into `SEASONS`.

## New members before their first backfill

A member with zero completed seasons exists only in the home page's "2026 Leagues" section —
`Members.tsx` builds its directory from `careerStats`, so ffu-057/ffu-058 have no directory entry
or detail page until 2026 is backfilled. See `ai-docs/DECISIONS.md` (2026-07-28) for the rule.

- [ ] Feed the upcoming rosters into the Members directory as a "Joining 2026" group (empty career;
      detail page must render gracefully with no seasons)
- [ ] Read Sleeper's `league.status` / draft status so membership-shaped views can flip at draft
      completion rather than at "ids are configured" — only needed once the group above exists

## Deferred / not blocking Week 1

- Phase 5 apex cutover (`ffunion.com`) — see `ai-docs/DEPLOY.md`
- Playoff weeks (15–17) in the live "This Week" section — regular season only for now
- H2H matrix, draft fun-facts, playoff machine, further live-active-week refinements — per
  `CLAUDE.md` "Next / open"
- Lineal Championship (`/lineal`) reads completed seasons only, so the belt won't move during a live
  season until that year is backfilled. Wiring `liveSleeper` games into `linealHistory` would fix
  that (the selector takes any `SeasonData[]`, so it's a data-assembly job, not a selector change).
