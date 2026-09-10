# TODO

Living task list — not a spec or a plan doc. Check things off as they're done, add items as they
come up, delete anything that's no longer relevant. Claude: keep this current as work happens;
don't let it go stale.

## Inbox (unsorted)

Dump raw items here — one line each, no format required, no section needed. Claude: triage these
into the right section below (or just do them), then delete the line from here. Anything sitting in
this section is unread by me until you say so, so it's safe to leave half-formed thoughts.

- [ ] _(empty)_

## 2026 season — ready for Week 1

- [x] Get 2026 Sleeper league IDs (Premier/Masters/National) from the commissioner/Sleeper app
- [x] Add those ids to `src/config/liveSeason.ts`'s `LIVE_LEAGUE_IDS['2026']` (all 3 tiers) — this
      is what turns on the live "This Week" home page section (added 2026-07-18; leagues pre_draft)
- [x] **Registry complete for 2026** — re-audited against live Sleeper 2026-08-21: all three
      leagues are full (36/36 rosters, no open slots), every roster owner AND every `draft_order`
      entry resolves to a member, all 36 have a team logo, and every 2026 team NAME matches what
      `nameForYear` would render — zero renames to transcribe. Note when checking names yourself:
      11 of the 36 have no `metadata.team_name` set on Sleeper, so Sleeper shows their username;
      the registry name is correct in those cases and a naive comparison will look like drift.
      Two names differ only by a curly vs straight apostrophe (ffu-038, ffu-040) — left alone
      deliberately, since the registry is internally consistent on straight apostrophes. Members added along the way:
      ffu-057 (YAC Attack) + ffu-058 (Croatian National Team) on 2026-07-28, ffu-059 (Seymour Owls)
      + ffu-060 (Fort Wayne Warthogs) on 2026-08-07; owners owner-057…owner-060 alongside them.
      Re-run the audit if the commissioner swaps anyone in before draft day — an unmapped account
      shows as "not listed yet" on the draft board and the home page's "2026 Leagues" section, and
      `npm run draw-cup -- --seed 1 --dry-run` fails loudly on one.
- [x] Abbreviations corrected per the commissioner (2026-09-09): ffu-060 Fort Wayne Warthogs
      FWW → **HOGS**, ffu-058 Croatian National Team CNT → **CRO**. `abbreviation` is a stored
      registry field, not derived, so it is a one-line edit per member in `src/config/members.ts`.
- [x] Shton's Strikers (ffu-044) logo replaced with the commissioner's new artwork (2026-09-09),
      resized 1254px → 256px square into `public/team-logos/ffu-044.png`.
- [ ] Team logos for anyone added LATER: drop `public/team-logos/{ffuId}.png` (max 256px,
      square-ish — the avatar is a circular `object-cover` mask)
- [ ] Add a 2026 entry to `src/config/prizes.ts` once the commissioner posts `prizes.txt` for 2026
- [x] (Data) Backfill National 2018–2020 divisions (Bronze/Copper/Brass/Nickel) so their $10
      division-champ prizes attribute (done 2026-07-27 — pulled from ESPN league 4270 via the
      sibling `espn-api` repo; see the header of `scripts/backfill-espn-divisions.mjs` for the
      reproduction commands). Divisions were the *only* gap vs Premier for those seasons.
- [ ] Prepare a home page draft announcement section (new — see below)
- [ ] Spot-check the live "This Week" section once real ids are in, early in Week 1

## Drafts page — live season

- [x] `/drafts` offers the live season alongside the completed ones and shows its **draft board**
      pre-draft: real board chrome (team nameplates, round rail, snake), every cell showing the
      coordinate + overall pick it will hold, click a team to spotlight its picks (2026-08-20).
      Order comes live from Sleeper via `fetchDraftOrder`; unmapped managers keep their slot and are
      counted as "not listed yet". `/drafts` now DEFAULTS to the live year.
- [x] **Fills as picks happen** (2026-08-20). `fetchDraftPicks` maps Sleeper picks straight into the
      `DraftPick` shape, so live picks render through the same `PickCell` as a completed board. No
      player map needed: each pick's `metadata` carries name/position/NFL team inline.
      `useLiveDraftPicks` polls every 12s, pauses while the tab is hidden (refreshing on return),
      and stops once the board is full. Next pick is flagged "on the clock".
- [ ] Watch the first live draft (Masters, Sun Aug 30) and sanity-check: does `pick_no` stay
      contiguous with an autopick/queue, and does a traded pick attribute to the acquirer as it does
      in the backfilled data?
- [ ] Once 2026 is backfilled, the year moves out of `LIVE_LEAGUE_IDS` into `SEASONS` and the page
      switches to the completed board on its own — no code change

## Home page — draft announcement section

- [ ] Design + build a section (likely on Overview, near the top) announcing the upcoming/live draft
      — exact content/timing TBD
- [x] Draft date + time per tier, live from Sleeper (2026-08-07): `useDraftSchedules` →
      `fetchDraftSchedules` reads `/league/{id}/drafts` and `UpcomingDrafts` renders each tier's
      `start_time` (viewer's timezone, zone named) or TBD when the commissioner hasn't set one.
      Deliberately NOT copied into config — Masters/National fill in on their own when set.
      Dates are read live, so they follow the commissioner: as of 2026-08-20 all three are set —
      Masters Sun Aug 30 9:15 PM ET, National Wed Sep 2 8:00 PM ET, Premier Mon Sep 7 2:00 PM ET
      (Premier moved from the Aug 22 date noted here on 2026-08-07).
- [x] "2026 Leagues" section under Upcoming Drafts: who's signed up per tier, tagged Promoted /
      Relegated / Returning / New vs the last completed season (2026-07-28). Live from Sleeper via
      `useLeagueRosters` + the `upcomingRosters` selector; disappears on its own once 2026 moves out
      of `LIVE_LEAGUE_IDS` into `SEASONS`.

## Members directory reads the current season's rosters

- [x] **Done 2026-09-09.** The directory grouped members by their finish in the last COMPLETED
      season, so all preseason and all September it showed everyone in the tier they had just left.
      Measured against live Sleeper that day it was wrong for 20 members: 12 in the wrong tier
      (Raging Rhinos, Head Cow and the Tooth Tuggers still in Masters after promotion; CamDelphia,
      El Guapo Puto and Pottsville still in Premier after relegation), 4 new members missing
      entirely, and 4 departed members still listed as active.
      Who is in which league is a fact about SIGNUPS, not about games — Sleeper knows it from the
      day the commissioner creates the leagues, months before week 1. `membersByLeague(seasons,
      currentRosters)` now takes the live rosters (`useLeagueRosters`, the same hook the home page
      already used) and groups off them, falling back to last-season finishes only when Sleeper
      gives us nothing. Verified against live 2026: 12/12/12, promotions and relegations correct,
      the four newcomers present, the four departures moved to past members.
- [x] A first-time member now has a directory entry and an openable detail page (`membersById`
      builds the lookup from the groups, so anything listed can be opened; `MemberDetail` shows a
      short "playing their first FFU season" panel instead of a wall of zeroes and empty tables).
      This closes the old "Joining 2026" item — they appear in their actual tier rather than a
      separate group, which is what the commissioner's rosters actually say.
- [ ] Sleeper's `league.status` is still not read. Not needed for the above (rosters alone are
      enough), but it would let membership views distinguish "signed up" from "drafted" if that
      ever matters. Deferred.
- [ ] `currentLeague(c)` (used by `TeamProfileModal`) still answers from the last completed season.
      Same staleness, smaller blast radius — worth pointing at the rosters too when convenient.

## FFU Cup (inaugural, 2026)

Page is `/cup` (was `/tournament`, which redirects). Rules live in `src/config/cup.ts`; the season's
weeks + field live in `public/data/2026/tournament.json`. See `ai-docs/DECISIONS.md` (2026-08-20).

- [x] Amendment applied: name, 5-round schedule (wks 6/7/8/10/12), round rules, draw + seeding
      procedure, winner's spoils (2026-08-20). Page opens on the Bracket tab (an outline of empty
      slots until the draw) with everything else under Format & Rules; `?view=` keeps tabs linkable
- [x] **Cup prize amounts** (2026-08-20): $10/$20/$40/$60/$100 per round won, in
      `PRIZE_SCHEDULES['2026'].cup`. NB that entry's `tiers` is still empty — the regular
      season's 2026 prizes.txt is a separate outstanding item above
- [ ] **Hold the draw.** Two ways, same rules — both import `src/lib/cupDraw.mjs`, so they cannot
      diverge:
      - **Live on stream** at `/cup/draw` (unlisted operator view). Take a seed from something the
        audience watches happen, type it in on camera, then space-bar through the 18 ties. Downloads
        a sheet/CSV; the seed is the record. Afterwards still run the CLI to write the official file.
      - **Headless**: `npm run draw-cup -- --seed <published seed>` writes the 36 participants
        (with seeds) + the opening ties into `public/data/2026/tournament.json`, and the Cup page
        flips from outline to live bracket on its own. Rehearse first with `--dry-run`.
      - Publish the seed BEFORE drawing — a number nobody controls and nobody knows yet (e.g. the
        combined final score of an announced NFL game). That is what makes the draw checkable:
        anyone can re-run the same command and diff the result.
      - Wait until Premier's and Masters' draft orders are FINAL on Sleeper. The script reads them
        live, and a pre-draft order can still be changed by the commissioner. (National's order is
        irrelevant — National teams never draw, they are only drawn.)
      - Verified 2026-08-20 against live Sleeper: all 36 owners resolve to registry members and both
        drawing tiers already have an order set, so the pipeline runs end to end today
- [x] **Elimination counts fixed** (2026-09-09). The Schedule table read 9 eliminated in the Round
      of 18 and 5 in the quarterfinals; the commissioner is right that it is **10 and 4**. The
      bracket engine was always correct — only the attribution was off. `dropLowestWinner` rides on
      the round that INHERITS the shrunken field (r8), and both `outlineTournament` and
      `resolveTournament` credited the culled team to that round. But the team wins its game in the
      Round of 18 and is eliminated there, which is what `CUP_ROUND_RULES.r18` already said. The
      drop now attaches to the round the team actually played, which also fixes a second bug: the
      resolved bracket had been scoring the dropped team in the quarterfinal week, a game it never
      played. Bracket note copy updated to match.
- [ ] Confirm the tournament weeks with the commissioner once Draft Day is finalized; they are
      variable by design, so edit the `rounds[].week` values if they move
- [ ] **Open rule question:** after the lowest-winner drop leaves 8 teams, how do they re-pair for
      the quarterfinals? The engine currently pairs adjacent winners; a round can carry authored
      `matchups` to override once ruled on
- [ ] The live bracket needs 2026 tier data, which only exists after the season is backfilled —
      decide whether the Cup should read `liveSleeper` mid-season instead (same gap as Lineal, below)
- [ ] Verify the Discord role name: the amendment says "FA Cup Winner"; assumed verbatim, not a typo
      for "FFU Cup Winner"

## FFU Cup draw — announcer voice

- [x] Announcer plumbing + clip playback built (2026-08-21): phrase tokens, clip generator, clip
      playback, browser-speech fallback, tests.
- [x] **Switched OFF in the live draw** (2026-08-21) — no voice we could produce got near the brief,
      so `/cup/draw` is silent apart from the wheel. The pipeline is PARKED, not deleted: see the
      banner at the top of `src/lib/announcer.ts` for how to re-enable it in one place.
- [ ] **Get a real voice, then switch it back on.** The shipped set is macOS `say` and sounds like a satnav —
      nothing local gets near a game announcer. Produce the SAME filenames from a neural TTS or a
      human recording and drop them into `public/audio/draw/`; no code changes.
      `npm run draw-vo -- --list` prints the exact script (61 lines). Do not clone a real
      announcer's voice — a generic hype voice gets the energy without the likeness problem.
- [ ] Settle the phrase set BEFORE recording: currently "{team} versus {team}" plus "First ever
      meeting!". Adding the league or the seed number means more lines to record.
- [ ] Optional, ~1hr: a Web Audio broadcast chain (compressor + saturation + short reverb + slight
      pitch drop) inside `clipVoice`. Flatters any source, so it is not wasted whichever voice
      lands. Not built — offered and deferred.
- [ ] Free first step worth trying before commissioning anything: download a macOS Enhanced/Premium
      voice (System Settings → Accessibility → Spoken Content → Manage Voices), change `VOICE` in
      `scripts/generate-draw-vo.mjs`, re-run `npm run draw-vo`. Notably better than the compact
      voice currently shipped.

## 2026 in-season data — static drafts, and how live the rest of the site gets

Both from the commissioner's list (2026-09-09). They are one question wearing two hats: how much of
2026 comes from static files vs. live Sleeper calls. **Needs a decision before building.**

- [ ] **Back the 2026 drafts with static data.** All three drafts are done (Masters Aug 30,
      National Sep 2, Premier Sep 7), so `/drafts` is polling Sleeper every 12s to redraw a board
      that can no longer change. Write `scripts/backfill-drafts.mjs` to pull the three drafts into
      `public/data/2026/{tier}.draft.json` in the existing `DraftData` shape (the live path already
      maps Sleeper picks into `DraftPick`, so the mapping exists — it moves from request time to
      build time). The page should prefer a static file when one exists and fall back to live, so
      the same code serves next year's draft night unchanged.
- [x] **Decided + built (2026-09-09): option 2, the weekly static refresh.**
      `npm run refresh-season` (`scripts/refresh-live-season.mjs`) writes the season being played
      into `public/data/{year}/{tier}.json` and updates `seasons.json`, so 2026 becomes an ordinary
      season and every page picks it up with no code change. **Completed weeks only** — the week in
      progress stays with the home page's This Week section, which never writes anything down. Pure
      mapping lives in `scripts/lib/sleeperSeason.mjs` (unit-tested); config/Sleeper helpers shared
      with `draw-cup.mjs` in `scripts/lib/ffuConfig.mjs`. Full rationale in `ai-docs/DECISIONS.md`.
      Verified by rebuilding 2025/2024/2022 from Sleeper and diffing: 252 regular-season games each,
      exact.
- [ ] **Run it for the first time once Week 1 finishes** (Tue 2026-09-15, after MNF). Nothing is
      written before then — as of 2026-09-09 there are zero completed weeks and the script says so
      and exits. Sanity-check Standings/Stats afterwards.
- [ ] **Then add 2026 to `src/config/seasons.ts`** — the script prints the exact three lines. Do it
      only AFTER the first refresh: registering a year whose data files don't exist 404s the site.
      This is what puts 2026 on the tier timeline and in `tiersForYear`.
- [x] **Scheduled (2026-09-09).** Cloud routine "FFU weekly season refresh", `0 14 * * 2` —
      Tuesdays 10am ET, after Monday Night Football flips Sleeper's week. It runs the script, checks
      the diff touches only `public/data`, runs all three gates, and commits + pushes to `main` only
      if they pass; it reports "no change" and commits nothing otherwise. It deliberately does NOT
      edit `src/config/seasons.ts` — it just reports that the year still needs adding.
      https://claude.ai/code/routines/trig_01Uj2kArjPCPNQ43h9py8hBP
      NB the cron is fixed UTC, so it shifts to 9am ET when the clocks change in November. Fine for
      a Tuesday-morning job; move it to `0 15 * * 2` if the later slot is ever wanted back.
- [ ] Playoffs (weeks 15–17) are still out of scope: the script writes regular-season games only,
      reading each league's own `playoff_week_start`. January's backfill remains the thing that
      makes a season complete — final placements, promotions/relegations, playoff brackets.

## Milestone Watch — new page

From the commissioner (2026-09-09): the league is 8+ years old and members should be able to see
their progress toward career milestones. A member appears on the page once they are ~75% of the way
to their next milestone in any category.

- [ ] Confirm the thresholds and the watch cutoff with the commissioner before building:
      - Total points scored **and** points against: 10k / 15k / 20k / 25k
      - Career wins: 50 / 100 / 150
      - Career earnings: $500 / $1k / $1.5k (commissioner flagged this one with a "?" — confirm it
        is in, and that it counts Cup prizing as well as regular-season)
      - Is 75% the real cutoff, or should it be "within N of the line"? 75% of the way to 15k
        points is a long way out; 75% to 150 wins is much closer. A per-category cutoff may read
        better than one number.
- [ ] Build it by layers (`/milestones`, use the `feature-by-layers` skill). Everything needed is
      already derived: `careerStats` has points for/against and wins, and prizes are already
      computed for the earnings columns. So this is a pure selector — `milestoneProgress(career)` →
      next threshold, distance, percentage — plus a table page. **No new stored data**; do not
      cache "milestones reached" anywhere, derive it like everything else.
- [ ] Decide what happens when a milestone is PASSED: does it disappear from the watch list, or
      show as recently achieved for the rest of the season? A "just hit it" row is the fun part.
- [ ] Depends on the decision above: while 2026 is not in the provider, the page counts 2025 totals
      and someone can cross 10,000 points without the site noticing. Worth calling out on the page,
      or worth doing option (2) first.

## Deferred / not blocking Week 1

- Playoff weeks (15–17) in the live "This Week" section — regular season only for now
- H2H matrix, draft fun-facts, playoff machine, further live-active-week refinements — per
  `CLAUDE.md` "Next / open"
- Lineal Championship (`/lineal`) reads completed seasons only, so the belt won't move during a live
  season until that year is backfilled. Wiring `liveSleeper` games into `linealHistory` would fix
  that (the selector takes any `SeasonData[]`, so it's a data-assembly job, not a selector change).
