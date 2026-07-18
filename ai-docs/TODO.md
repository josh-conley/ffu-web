# TODO

Living task list — not a spec or a plan doc. Check things off as they're done, add items as they
come up, delete anything that's no longer relevant. Claude: keep this current as work happens;
don't let it go stale.

## 2026 season — ready for Week 1

- [x] Get 2026 Sleeper league IDs (Premier/Masters/National) from the commissioner/Sleeper app
- [x] Add those ids to `src/config/liveSeason.ts`'s `LIVE_LEAGUE_IDS['2026']` (all 3 tiers) — this
      is what turns on the live "This Week" home page section (added 2026-07-18; leagues pre_draft)
- [ ] Add any new members to `src/config/members.ts` (ffuId + `platformIds.sleeper`)
- [ ] Add any new owners to `src/config/owners.ts`
- [ ] Confirm returning members' `platformIds.sleeper` still match (no swapped Sleeper accounts)
- [ ] Add a 2026 entry to `src/config/prizes.ts` once the commissioner posts `prizes.txt` for 2026
- [ ] Prepare a home page draft announcement section (new — see below)
- [ ] Spot-check the live "This Week" section once real ids are in, early in Week 1

## Home page — draft announcement section

- [ ] Design + build a section (likely on Overview, near the top) announcing the upcoming/live draft
      — exact content/timing TBD

## Deferred / not blocking Week 1

- Phase 5 apex cutover (`ffunion.com`) — see `ai-docs/DEPLOY.md`
- Playoff weeks (15–17) in the live "This Week" section — regular season only for now
- H2H matrix, draft fun-facts, playoff machine, further live-active-week refinements — per
  `CLAUDE.md` "Next / open"
