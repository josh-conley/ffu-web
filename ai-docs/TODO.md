# TODO

Living task list — not a spec or a plan doc. Check things off as they're done, add items as they
come up, delete anything that's no longer relevant. Claude: keep this current as work happens;
don't let it go stale.

## 2026 season — ready for Week 1

- [x] Get 2026 Sleeper league IDs (Premier/Masters/National) from the commissioner/Sleeper app
- [x] Add those ids to `src/config/liveSeason.ts`'s `LIVE_LEAGUE_IDS['2026']` (all 3 tiers) — this
      is what turns on the live "This Week" home page section (added 2026-07-18; leagues pre_draft)
- [ ] Add any new members to `src/config/members.ts` (ffuId + `platformIds.sleeper`) — rolling task
      until the leagues fill; done 2026-07-28 for ffu-057 (YAC Attack) + ffu-058 (Croatian National
      Team), and 2026-08-07 for ffu-059 (Seymour Owls) + ffu-060 (Fort Wayne Warthogs)
- [ ] Add any new owners to `src/config/owners.ts` — owner-057 (Tom) + owner-058 (Mladen) added
      2026-07-28; owner-059 (Alex) + owner-060 (Kam) added 2026-08-07
- [ ] Confirm returning members' `platformIds.sleeper` still match (no swapped Sleeper accounts)
      — as of 2026-08-07: all 12 National roster owners resolve to a registry member
- [ ] Team logos for new members: drop `public/team-logos/{ffuId}.png` (max 256px, square-ish — the
      avatar is a circular `object-cover` mask). Done 2026-08-07 for ffu-057…ffu-060.
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
- [x] Draft date + time per tier, live from Sleeper (2026-08-07): `useDraftSchedules` →
      `fetchDraftSchedules` reads `/league/{id}/drafts` and `UpcomingDrafts` renders each tier's
      `start_time` (viewer's timezone, zone named) or TBD when the commissioner hasn't set one.
      Deliberately NOT copied into config — Masters/National fill in on their own when set.
      Premier 2026 is set: 2026-08-22 8:30 PM ET.
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

## FFU Cup (inaugural, 2026)

Page is `/cup` (was `/tournament`, which redirects). Rules live in `src/config/cup.ts`; the season's
weeks + field live in `public/data/2026/tournament.json`. See `ai-docs/DECISIONS.md` (2026-08-20).

- [x] Amendment applied: name, 5-round schedule (wks 6/7/8/10/12), round rules, draw + seeding
      procedure, winner's spoils (2026-08-20). Page opens on the Bracket tab (an outline of empty
      slots until the draw) with everything else under Format & Rules; `?view=` keeps tabs linkable
- [x] **Cup prize amounts** (2026-08-20): $10/$20/$40/$60/$100 per round won, in
      `PRIZE_SCHEDULES['2026'].cup`. NB that entry's `tiers` is still empty — the regular
      season's 2026 prizes.txt is a separate outstanding item above
- [ ] **Hold the draw**: `npm run draw-cup -- --seed <published seed>` writes the 36 participants
      (with seeds) + the opening ties into `public/data/2026/tournament.json`, and the page flips
      from outline to live bracket on its own. Rehearse first with `--dry-run`.
      - Publish the seed BEFORE drawing — a number nobody controls and nobody knows yet (e.g. the
        combined final score of an announced NFL game). That is what makes the draw checkable:
        anyone can re-run the same command and diff the result.
      - Wait until Premier's and Masters' draft orders are FINAL on Sleeper. The script reads them
        live, and a pre-draft order can still be changed by the commissioner. (National's order is
        irrelevant — National teams never draw, they are only drawn.)
      - Verified 2026-08-20 against live Sleeper: all 36 owners resolve to registry members and both
        drawing tiers already have an order set, so the pipeline runs end to end today
- [ ] Confirm the tournament weeks with the commissioner once Draft Day is finalized; they are
      variable by design, so edit the `rounds[].week` values if they move
- [ ] **Open rule question:** after the lowest-winner drop leaves 8 teams, how do they re-pair for
      the quarterfinals? The engine currently pairs adjacent winners; a round can carry authored
      `matchups` to override once ruled on
- [ ] The live bracket needs 2026 tier data, which only exists after the season is backfilled —
      decide whether the Cup should read `liveSleeper` mid-season instead (same gap as Lineal, below)
- [ ] Verify the Discord role name: the amendment says "FA Cup Winner"; assumed verbatim, not a typo
      for "FFU Cup Winner"

## Deferred / not blocking Week 1

- Playoff weeks (15–17) in the live "This Week" section — regular season only for now
- H2H matrix, draft fun-facts, playoff machine, further live-active-week refinements — per
  `CLAUDE.md` "Next / open"
- Lineal Championship (`/lineal`) reads completed seasons only, so the belt won't move during a live
  season until that year is backfilled. Wiring `liveSleeper` games into `linealHistory` would fix
  that (the selector takes any `SeasonData[]`, so it's a data-assembly job, not a selector change).
