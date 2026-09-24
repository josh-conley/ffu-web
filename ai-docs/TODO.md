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
- [x] Spot-check the live "This Week" section once real ids are in: in use through week 2 (the
      commissioner has been working from the live lineup modal)

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
- [x] `pick_no` stayed contiguous through all three live drafts: checked 2026-09-23 against the
      backfilled files, 1–180 with no gaps in every tier
- [ ] Still unverified: does a traded pick attribute to the acquirer, as it does in the older
      backfilled data? Needs a known 2026 trade to check against
- [ ] Once 2026 is backfilled, the year moves out of `LIVE_LEAGUE_IDS` into `SEASONS` and the page
      switches to the completed board on its own — no code change

## Home page — draft announcement section

- [ ] **Next preseason:** a proper announcement section (likely on Overview, near the top) for the
      upcoming/live draft. Content/timing TBD. For 2026 the Upcoming Drafts + 2026 Leagues sections
      below did the job
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

## 2026 in-season data — static drafts, and how live the rest of the site gets

Both from the commissioner's list (2026-09-09). They are one question wearing two hats: how much of
2026 comes from static files vs. live Sleeper calls. **Needs a decision before building.**

- [x] **Done 2026-09-09.** `npm run backfill-drafts` (`scripts/backfill-drafts.mjs`) wrote all
      three completed 2026 drafts — 180 picks each — into `public/data/2026/{tier}.draft.json`.
      `/drafts` no longer polls Sleeper for them: `useDraftSource` tries the static file first and
      falls back to live only when there isn't one, so draft night still works with no file present
      and the finished board takes over by itself the moment one is written. A tier whose draft
      isn't `complete` on Sleeper is skipped rather than written half-finished.
      Pure mapping in `scripts/lib/sleeperDraft.mjs` (unit-tested), the twin of the client-side
      mapping in `src/data/liveDrafts.ts`; `--verify <year>` rebuilds a completed year from Sleeper
      and diffs it, which keeps the two from drifting. 2025 reproduces exactly (540 picks).
- [ ] **Draft `type` is `unknown` for 2021–2025.** Found by the verify harness: the legacy migration
      never captured it for Sleeper-era drafts, though Sleeper reports `snake` and always has (the
      ESPN-era 2018–2020 files do say `snake`). Purely cosmetic today — nothing reads `type` — but
      it is wrong data, and `backfill-drafts` could set it from Sleeper in one pass over the 15
      files. Not done unasked, since it edits already-backfilled seasons.
- [x] **Decided + built (2026-09-09): option 2, the weekly static refresh.**
      `npm run refresh-season` (`scripts/refresh-live-season.mjs`) writes the season being played
      into `public/data/{year}/{tier}.json` and updates `seasons.json`, so 2026 becomes an ordinary
      season and every page picks it up with no code change. **Completed weeks only** — the week in
      progress stays with the home page's This Week section, which never writes anything down. Pure
      mapping lives in `scripts/lib/sleeperSeason.mjs` (unit-tested); config/Sleeper helpers shared
      with `draw-cup.mjs` in `scripts/lib/ffuConfig.mjs`. Full rationale in `ai-docs/DECISIONS.md`.
      Verified by rebuilding 2025/2024/2022 from Sleeper and diffing: 252 regular-season games each,
      exact.
- [x] **Shell written and 2026 registered (2026-09-09).** The season file no longer waits for a
      completed week: league metadata, teams and divisions (Diamond/Platinum/Gold) are facts from
      the day the leagues were created, so `public/data/2026/{tier}.json` now exists with
      `games: []` and fills in weekly. 2026 is in `src/config/seasons.ts`. See
      `ai-docs/DECISIONS.md` for the `hasBeenPlayed` invariant this required and the five guards
      that hang off it.
- [x] **First real games landed — by hand, 2026-09-17.** Both 09-15 runs of the claude.ai routine
      fired and reported success, but its cloud environment's egress allowlist blocks
      `api.sleeper.app` (`403 Host not in allowlist`), so nothing was fetched. Even with network,
      week 1 would have stopped at the gates: three tests pinned counts over the live data (Stats
      row count, Matchups "Upcoming" count, Minutemen tenure) and one exposed a real bug —
      `upcomingRosters` compared 2026 against itself once it had games, wiping every
      Promoted/Relegated/New tag on the home page. All fixed; those tests now derive from the data.
- [x] **Weekly refresh is a GitHub Action (2026-09-17)** — `.github/workflows/refresh-season.yml`,
      replacing the claude.ai routine (`trig_01Uj2kArjPCPNQ43h9py8hBP`, now **disabled**; delete it
      once the Action has had a good Tuesday). Why: the job is fixed steps, a failure should be a
      red ✗ + email rather than a "successful" AI session, runners reach Sleeper with no allowlist,
      and the schedule + steps live in the repo instead of a prompt that went stale silently.
      Tuesdays 10:00 + 14:00 UTC (6am/10am ET; an hour earlier after 1 Nov), **September–December
      only**: the second run is a safety net for Sleeper rolling its week late and no-ops if the
      first committed; January is excluded because the script defaults to the calendar year and
      refuses a non-live one. Also runnable by hand from the Actions tab ("Run workflow").
      Flow: refresh-season → backfill-drafts → backfill-lineups (the live year only — see below)
      → `scripts/check-season-refresh.mjs` (the judgment the
      routine's prompt used to carry, now code: fails on a changed/removed completed score or any
      file outside `public/data/<year>/`, warns in the job summary if the schedule changed; pure
      diff in `scripts/lib/seasonDiff.mjs`, unit-tested) → typecheck/lint/test → commit as
      github-actions[bot] + push → `gh workflow run deploy.yml`. That last step is required: a push
      made with `GITHUB_TOKEN` does not trigger other workflows, so `deploy.yml`'s `on: push` never
      fires for the bot's commit.
- [x] **Lineups land weekly too (2026-09-17).** The refresh wrote games but never lineups, so every
      2026 game opened the Matchups modal on "Lineups aren't available for this game".
      `backfill-lineups.mjs` narrowed to one year used to be a *trial* that skipped players.json and
      the manifest; it now merges the players it saw into players.json (replacing it from a subset
      would drop everyone the other seasons resolve) and sets `hasLineups` for what it wrote, so
      completed seasons are untouched and reruns are byte-identical. Its own check — starter sums
      vs the stored game score — passed for all three tiers in week 1.
- [ ] **First scheduled run went red (2026-09-22)** on `npm test`, not on data: two tests assumed
      the live season was one week old. Fixed the same day in `648c047`, and week 2 was committed by
      hand. Two things to watch on **2026-09-29**, which is the Action's first real chance at a clean
      run: (a) only ONE of the two schedules fired that day (the 14:00 UTC one at 14:20; the 10:00
      run never appeared, as GitHub can drop scheduled runs under load), and (b) the claude.ai
      routine above still needs deleting once a Tuesday goes green.
- [ ] **Next preseason:** update `LIVE_LEAGUE_IDS` before the first September Tuesday, or the Action
      fails red (which is the reminder). NB GitHub disables scheduled workflows after 60 days with
      no repo activity — if the repo is quiet all offseason, re-enable it in the Actions tab.
- [ ] Playoffs (weeks 15–17) are still out of scope: the script writes regular-season games only,
      reading each league's own `playoff_week_start`. January's backfill remains the thing that
      makes a season complete — final placements, promotions/relegations, playoff brackets.

## Around the Union — new page

Built 2026-09-17 at the commissioner's request: the FFUN newsletter's page-2 staple, which he has
been updating by hand for years. Route `/around-the-union`, in the Stats & More menu, plus a home
page teaser while a season is live.

- [x] **Two blocks, both derived.** The week's top 3 scores across all three leagues, and each
      league's total points + avg per team-game, ranked. Pure selector
      (`src/selectors/aroundTheUnion.ts`), no network — it reads the static season files the Tuesday
      refresh Action already writes, so a week appears here the morning it finishes and the numbers
      can never disagree with Standings or Matchups.
- [x] **Built for capture**, which is the actual ask: the panel is one self-contained bordered unit
      with its own titled header, and every control sits outside it so a screenshot of just the
      panel needs no cropping and explains itself on page 2.
- [x] A week counts only when EVERY league has played it (the intersection of the tiers, not the
      union). A half-written Tuesday must not publish a "top 3" drawn from a partial field.
- [x] League totals read the STORED Points For, the same source `selectors/standings.ts` uses, so
      the table is always the sum of the Standings page. Ranked by total points; ties share a rank,
      as do tied scores on the podium (everyone level with 3rd makes it).
- [x] **FFUN layout added 2026-09-17**, at the commissioner's request ("save on vertical spacing
      / a hidden screenshot mode"). `?layout=ffun` (toggle on the page, in the URL so he can
      bookmark it) folds the panel into the newsletter's own horizontal bands — leader beside its
      runners-up, then one footer strip carrying all three leagues as paired chips (avg in the solid
      tier color, total in the soft one). Roughly a third the height of the standard view. Not
      hidden: a visible toggle is discoverable and costs nothing, and the standard view is still the
      better one to READ on the site. The page intro paragraph was dropped at the same time.
      NB the newsletter leaves those chips unlabelled and lets color carry the league; ours keeps a
      short label, since color alone as the sole encoding fails anyone who can't separate gold from
      red.
- [ ] **Worth confirming with the commissioner**: the screenshot he sent is an END-of-season panel
      (168 team-games), so "Total League Points" there is a full-season figure. This page reports
      season-to-date, which is what makes it useful in week 6 — say if he wants anything else.
- [x] **Copy as image (2026-09-17)** — asked for after all, as a clipboard copy rather than the
      download that was first offered. "Copy image" beside the layout toggle renders the panel at 2x
      via `html-to-image` (the one new runtime dependency; dynamically imported so it stays out of
      every other page's bundle) and writes a PNG to the clipboard. What is copied is what is on
      screen, the viewer's THEME included — switch to light before copying if the FFUN page is
      light. Falls back to downloading the PNG where a browser won't take an image on the clipboard,
      and says which it did, since silently claiming "Copied" sends the author to an empty
      clipboard. Verified end to end in Chrome.
- [x] **The FFUN panel is on the home page too (2026-09-17)**, directly under the FFU Cup banner —
      it replaced the one-line teaser, which the condensed layout made unnecessary. Reader's view
      only: the week picker and the copy button stay on `/around-the-union`, with a link down to it.
- [ ] Possible follow-ups nobody has asked for: the week's biggest blowout / closest game, and the
      high-score payout standings themselves once the 2026 prize schedule lands (`prizes.ts` still
      has an empty `tiers` for 2026 — separate item above).

## Milestone Watch — new page

Built 2026-09-09. Route `/milestones`, in the Stats & More menu. Pure selector
(`src/selectors/milestones.ts`) over the same career totals the Stats page uses, so the two can
never disagree; nothing is stored.

- [x] **Progress is measured from the milestone last passed, not from zero.** This was the one real
      design decision and it was worth measuring rather than guessing. From zero, a member on 11,300
      points is "75% of the way to 15,000" despite having only just cleared 10,000, and would sit on
      the list for years: against the real data that puts **18 of 61** members on the points watch.
      From the previous milestone it is **7**, which is what "about to happen" should mean.
- [x] Milestones already banked are credited to the season they were reached in, derived by
      re-running the career totals year by year rather than accumulating by hand — so "10,000 in
      2024" comes from the same selectors as the figure beside it.
- [ ] **Two things to confirm with the commissioner** (both were flagged with a `?` originally):
      - **Earnings is in.** $500 / $1k / $1.5k, counting every prize including cross-league Cup
        prizing. Say if it should be regular-season only.
      - **75% is the cutoff**, one number for all four categories. `WATCH_THRESHOLD` in
        `src/selectors/milestones.ts` is the only place to change it, and `milestoneWatch` takes it
        as an argument, so a per-category cutoff is a small change if one is wanted.
- [ ] **The upper thresholds are years away** — worth knowing before anyone judges the page empty.
      Measured 2026-09-09: points max is 13,516 (nobody past 15k, let alone 20k/25k); wins max is 69
      (nobody past 100 or 150); earnings max is $1,635, and one member has passed $1,500. So in
      practice the page is about the 10,000-point, 50-win and $500 lines for now, and the higher
      tiers sit there as the long game. Currently 33 teams on watch across the four categories.
- [ ] Optional: a member's own milestone progress on their Members detail page. Not built.

## ADP Comparison — new page

Built 2026-09-09. Route `/adp-comparison`, in the Stats & More menu. Pinned to the season being played
(from `LIVE_LEAGUE_IDS`) — an ADP snapshot only exists for that year.

- [x] **Two baselines**, because they answer different questions. *vs FFU*: each pick against where
      the OTHER two leagues took the same player. *vs Sleeper ADP*: each pick against the wider
      half-PPR market. Biggest reaches and biggest values under either, plus a full board with all
      three leagues side by side, FFU ADP, Sleeper ADP and the spread. The reach/value lists are
      EVERY pick on that side of the baseline (250-odd each), paged ten at a time — the extremes
      lead and the tail is a page away rather than cut off at a top ten. Positions use the shared
      `posClass` badge, same colors as the draft list. Filterable by League, Team and Position
      (`?league=&team=&pos=`), through the shared `useFilters`/`FilterBar` layer rather than a
      third hand-rolled filter row.
- [x] **A pick is never part of its own baseline.** With three leagues, including it drags the
      average a third of the way toward the pick and hides the disagreement: Josh Jacobs at 52
      against a field of 115 is a 63-slot reach, but only 42 if his own pick is in the average.
- [x] **Sleeper ADP found and snapshotted** (`npm run backfill-adp` →
      `public/data/{year}/adp.json`). It is NOT in the documented v1 API — it lives on
      `api.sleeper.com/projections/nfl/{year}` under `stats.adp_half_ppr`. Half PPR because all
      three leagues score `rec: 0.5` (verified, not assumed). All 198 drafted players have a real
      value. Stored rather than read live because ADP is a market that keeps drifting after the
      drafts are over — the file is a dated record of the board the drafts were made against, which
      is why the script refuses to overwrite without `--force`.
- [x] **Round filter (2026-09-17)** — a two-knob slider setting a round RANGE (`?round=3-7`),
      alongside League/Team/Position. Added as a new `span` filter type in the shared
      `useFilters`/`FilterBar` layer rather than a page-local control, so any other view can take one.
      The existing two-knob slider (the Builds page's year range) was lifted out of
      `RosterBuildControls` into `src/components/DualRangeSlider.tsx` and both now share it.
      Reach/value rows filter on their own pick's round; a board row survives if ANY of the leagues
      that took the player did so in the span, matching how League and Team already behave there.
      A span covering the whole draft clears itself from the URL so it doesn't count as active.
- [ ] The projections endpoint is undocumented, so treat a shape change as expected someday. The
      script fails loudly rather than writing a file of nulls. If it breaks, `adp_ppr`, `adp_std`
      and `adp_2qb` are in the same payload.
- [ ] Not built, offered: per-manager summaries (who reached most / found the most value across
      their whole board), and keeping the page for past seasons — that needs an ADP snapshot per
      year, which we only have from 2026 on.

## Housekeeping

- [ ] **Division data for 2018–2024 exists only on one machine.** `backfill-divisions.mjs` (Sleeper
      2021–2024) and `backfill-espn-divisions.mjs` (ESPN 2018–2020, which needed ESPN cookies) wrote
      their results into `legacy-source/data/divisions-supplement.json`, and `legacy-source/` is
      gitignored. `public/data` has the divisions baked in and is committed, so the SITE is safe.
      But re-running `npm run migrate` from a fresh `legacy-source/` (the README's regeneration
      recipe) would silently drop those divisions. Options: commit the supplement (and the two
      small `espn-*-divisions.json` exports) somewhere tracked, or declare the migration retired and
      make `migrate` refuse to run. Needs a decision, not urgent.
- [ ] Old branches: local `analysis/premier-draft-habits`, `feat/record-book`, `temp/draft-adp-2025`
      are unmerged (1–2 commits each); remote `auto/req-1513019765906608228` and
      `auto/req-1513025624921346048` are June Discord-bot leftovers. Keep or delete?
- [ ] `actions/checkout` + `setup-node` bumped v4 → v5 (2026-09-23) for the Node 20 deprecation
      warning. `deploy-pages@v4` / `upload-pages-artifact@v3` may carry the same warning; check the
      next deploy's annotations and bump those if so.

## Deferred / not blocking Week 1

- Playoff weeks (15–17) in the live "This Week" section — regular season only for now
- H2H matrix, draft fun-facts, playoff machine, further live-active-week refinements — per
  `CLAUDE.md` "Next / open"
- Lineal Championship (`/lineal`) reads completed seasons only, so the belt won't move during a live
  season until that year is backfilled. Wiring `liveSleeper` games into `linealHistory` would fix
  that (the selector takes any `SeasonData[]`, so it's a data-assembly job, not a selector change).
