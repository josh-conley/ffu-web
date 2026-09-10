# Decisions

Short ADR-style notes for choices that aren't obvious from the code and would otherwise get
re-litigated. Newest first. Keep each entry to what was decided, why, and what it constrains.

---

## 2026-08-21 — The draw announcer speaks in phrase tokens, not sentences

**Context.** The commissioner wants the streamed draw announced aloud, in the style of a game
announcer. Browser `speechSynthesis` is free and instant but sounds like a satnav; a hype voice
really needs pre-generated audio clips.

**Decision.** Build the plumbing once, against PHRASE TOKENS, and treat the voice as swappable.
`AnnouncePhrase` says what is meant — `{kind:'team'}`, `{kind:'word'}` — never a finished sentence.
`browserVoice` renders tokens to text for `speechSynthesis`; a future clip voice maps the same
tokens onto audio files. Neither the call site nor the wording logic changes between them.

**Why not go straight to clips.** The unknown was whether an announcer helps the broadcast at all,
and what its timing against the reveal should be. Browser speech answered both cheaply — and was
then rejected on quality within the hour, which is exactly the outcome the cheap step is for. The
clip path (`clipVoice` + `scripts/generate-draw-vo.mjs`) landed the same day.

**On the voice itself.** Nothing available locally sounds like a game announcer: every macOS `say`
voice is satnav-class, only compact voices are installed, and there is no ffmpeg or sox here for
post-processing. The generated set is explicitly a PLACEHOLDER. Getting the real thing means
producing the same filenames from a neural TTS or a human recording — `npm run draw-vo -- --list`
prints the exact script. No code changes.

**Switched off, kept intact (same day).** The commissioner heard it and cut the voiceover from the
live draw: no voice we could produce was close to the brief, and a bad announcer is worse than
none. The pipeline is PARKED rather than deleted — generator, clip playback, phrase tokens and
tests all still work, so landing a real voice later is a file drop plus re-wiring one effect.

This is deliberate debt, written down rather than hidden (Charter §1). The unwired modules carry a
banner saying so and pointing at how to re-enable them; without it they read as dead code and the
next person deletes them. If a real voice never materialises, delete `announcer.ts`,
`clipVoice.ts`, `announceClips.mjs`, `scripts/generate-draw-vo.mjs` and `public/audio/draw/`
together — they are one unit.

**Consequences.**
- `SPOKEN_NAMES` maps ffuId → respelling for names a synthesiser mangles (FFUcked Up, Jawn of Arc,
  bstarrr…). It lives in `announceClips.mjs` because the generator and the app both need it.
- `clipKey` is the contract between the two: the generator writes `{key}.m4a`, the player asks for
  the same key. A mismatch would be SILENT — clips just never play — so a test asserts it directly.
- Speaking always cancels first, so a fast operator can't stack two ties over each other.
- Everything is best-effort — a platform with no speech synthesis stays silent rather than throwing
  mid-broadcast, and the mute toggle covers wheel and voice together.
- **Do not clone a real announcer's voice** when the clip route is built. A generic hype voice gets
  the same energy without appropriating a person's likeness.

---

## 2026-08-21 — The streamed draw reuses the algorithm, not just the rules

**Context.** The commissioner wants the Cup draw run as a live streamed event with some fanfare,
rather than a terminal command. The obvious build — a React page that draws teams as you click — is
a trap: it would be a SECOND implementation of rules that decide a competition paying out $230, and
the two would drift the first time anything changed.

**Decision.** `src/lib/cupDraw.mjs` (moved there from `scripts/lib/` so it sits inside the
tsconfig `include`) stays the single implementation. It is plain ESM with no Node APIs, so bare
`node` runs it for the CLI and Vite bundles it for the page. The live page at `/cup/draw` calls
`drawCup(field, seed)` ONCE, up front, and everything after that is presentation over an
already-final result — the spinner picks which crests flash, never who was drawn.

Sheet formatting moved to `src/lib/drawSheet.mjs` for the same reason: the text read out on stream,
the file downloaded from the page, and the CLI's stdout are the same bytes.

**Why the result is computed up front** rather than one tie at a time: it makes the animation
provably incapable of affecting the outcome, it survives a mid-draw browser crash (reload, same
seed, same bracket), and it means the page cannot produce a bracket the CLI would not.

**Consequences.**
- A `.d.mts` declares the module's types; the algorithm file itself stays JavaScript. Converting it
  to TypeScript would break `scripts/draw-cup.mjs`, which has no TS runner.
- The page needs the field from Sleeper, so `useCupField` refuses to hand back a partial one: an
  unmapped manager or an unset draft order blocks the draw with a specific message rather than
  drawing a wrong bracket.
- The seed remains the record. The page offers a sheet/CSV download for Discord, but the official
  `tournament.json` is still written by the CLI afterwards from the same seed.
- **Viewers following along on their own devices is deliberately NOT built** — that needs shared
  server state this site has no backend for. The stream is the broadcast; `/cup/draw` is one
  operator's screen.
- `/cup/draw` is unlisted (not in `nav.ts`). It is an operator view for one night, not a page to
  browse to.

---

## 2026-08-20 — The Cup draw is seeded, and the seed is published first

**Context.** The Round of 36 draw decides a competition that pays out ($230 to a team that runs the
table). Someone will draw a brutal opening tie, and they need a way to satisfy themselves it wasn't
arranged. "The commissioner ran it" and "an AI ran it" are equally unverifiable after the fact.

**Decision.** `npm run draw-cup -- --seed <s>` conducts the draw from a seeded PRNG, and the seed is
**committed publicly before the draw happens** — a value nobody controls and nobody yet knows (e.g.
the combined final score of an announced NFL game). Same seed + same field ⇒ byte-identical bracket,
so anyone can re-run the command and diff `public/data/{year}/tournament.json`. `--seed` is required:
there is deliberately no path that produces an unreproducible result.

**Why not just draw it.** A one-off shuffle is trivial to write and impossible to audit. Committing
to the entropy source in advance costs nothing and converts "trust us" into "check it yourself" —
worth it once, for the input that shapes the entire tournament. A live Discord draw is the other
honest option (everyone watches) and composes fine with this: run the script from the committed
seed, then reveal the ties one at a time.

**Consequences.**
- `scripts/lib/cupDraw.mjs` is pure and has no I/O, so the algorithm is testable and the CLI stays a
  thin shell around Sleeper reads. Plain `.mjs`, matching the other scripts (no TS runner).
- Premier draws from all 24 Masters + National teams as ONE pool. "Pick a league, then pick a team"
  satisfies the 6/6 quota but skews the odds as the pools diverge in size; a distribution test pins
  the correct behaviour, since nothing else would catch the difference.
- Only **Premier and Masters** draft orders are read. National teams never draw — they are only ever
  drawn — so National's draft date never blocks the Cup draw.
- Run it only once both drawing tiers' orders are FINAL on Sleeper; a pre-draft order can still be
  changed by the commissioner. An already-drawn season needs `--force` to overwrite.
- Seeds 1–36 are recorded because the amendment specifies them, but **nothing consumes them yet**.
  If later rounds re-seed (best remaining vs worst remaining), they are the mechanism and the engine
  needs that rule; if later rounds follow bracket position, they are decorative. Open with the
  commissioner — see `ai-docs/TODO.md`.

---

## 2026-08-20 — The Cup is published before it is drawn

**Context.** The commissioner's amendment establishes the **FFU Cup**: a 36-team, cross-league
knockout run inside the regular season (all three tiers, single elimination, your normal weekly
lineup score is your Cup score). The inaugural running is 2026. Rounds and their NFL weeks are
announced with Draft Day; the field is not known until the draw is held some weeks later.

**Decision.** Split the Cup across three homes by *how often the fact changes*:

| Fact | Home | Why |
|---|---|---|
| Name, field size, round rules, winner's spoils, accent | `src/config/cup.ts` | Same every season |
| Which weeks the rounds fall on; who drew whom; seeds | `public/data/{year}/tournament.json` | Varies per season — the amendment says timing is variable "considering NFL bye week impacts and the FFU calendar" |
| Round sizes, winners, advancement | `src/selectors/tournament.ts` | Derived, never stored |

`Tournament.participants` is therefore allowed to be **empty**, with a new required `fieldSize`
carrying the shape. `outlineTournament` derives each round's entrants/games/eliminations from
`fieldSize` alone, so the page renders a real bracket outline months before anyone is drawn into it,
and `resolveTournament` takes over unchanged once the field lands.

**Why not fabricate placeholder teams** and feed the existing bracket renderer? That would put
invented participants into the data the resolver reads. `CupBracketOutline` renders blank slots from
the outline instead — no fake data, and both renderers take their shape from the same rounds, so
they cannot disagree.

**Consequences.**
- The tier season fetches are gated on `participants.length > 0` (`useCup`). A live season has no
  `public/data/{year}/*.json` yet, so an ungated fetch would fail the page.
- The 2025 backfill bracket is **not** published: it was a dry run of the format against real 2025
  scores, never a contested competition, and the site should only show Cups that happened. It moved
  to `src/test/fixtures/tournament-2025.json`, where it remains the engine's end-to-end test.
- Cup prize amounts live in `src/config/prizes.ts` (`SeasonPrizeSchedule.cup`) alongside every other
  payout, keyed by the round a team wins to earn it; a year with no `cup` entry renders "TBA" rather
  than a guess. The Cup pays for winning *and advancing*, so the Round of 18's lowest-scoring winner
  is not paid — `cupWinnerPurse` sums the champion's run ($230 in 2026).
- **Still unspecified by the amendment:** how the 8 survivors re-pair for the quarterfinals after the
  lowest-winner drop. The engine pairs adjacent winners (`pairAdjacent`); a round can override that
  with authored `matchups` when the commissioner rules on it.

---

## 2026-07-28 — When a season counts as "started"

**Decision.** A season is *entered* once its **draft has completed**, and *played out* once it has
been backfilled into `public/data/**`. These are two different facts and the site treats them
differently:

| | Governed by | Examples |
|---|---|---|
| **Membership** — who is in which league | draft complete | directory presence, tier trail, tier streaks, "which league is X in" |
| **Performance** — how they did | season backfilled | record, points, win%, UPR, placements, championships, averages |

**Why.** The draft is the moment the field stops being provisional: rosters are final and anyone who
signed up but didn't show has dropped out. It's also observable rather than a judgment call —
Sleeper moves `league.status` `pre_draft` → `drafting` → `in_season`, and the draft object carries
its own status — so it stays data, not a hardcoded date (Charter: "era is data, not branching").

Performance aggregates must NOT flip at the draft. Mid-season `finalPlacement` is null, and a
win% or average-finish computed over three games would swing wildly week to week, destabilising
every number on Stats and Members until January. Career stats are a record of completed play.

**Consequences.**
- Two legitimate season counts exist, differing for one year at a time: seasons *entered* vs
  seasons *played out*. They must never both render as a bare number without a label — name them
  distinctly in code (`seasonsEntered` vs the existing `CareerStats.seasons`) if the first is ever
  needed outside the home page.
- Until 2026 is drafted, its members exist only in the home page's "2026 Leagues" section, which
  reads live from Sleeper. `Members.tsx` builds its directory from `careerStats(seasons)`, and a
  member with zero completed seasons never enters that map — so a brand-new member (ffu-057,
  ffu-058) has no directory entry or detail page until the backfill. Closing that gap means feeding
  the upcoming rosters into the directory as a "Joining 2026" group; deliberately deferred.
- The home page shows the upcoming season as a **hollow** tier dot (filled = played, ring = signed
  up) and counts forward — "9th season", not "8 seasons" — so nothing implies a season was played.
  When 2026 is backfilled the dot fills in on its own.

**Not yet built.** Nothing reads `league.status` today; the hollow dot appears as soon as ids are in
`LIVE_LEAGUE_IDS`, i.e. pre-draft, which is honest ("signed up"). The draft-status plumbing only
becomes necessary when something membership-shaped (the directory group above) needs to flip at a
precise moment. See `ai-docs/TODO.md`.

---

## 2026-07-31 — Ship a self-destructing `/sw.js` to evict the old site's service worker

**Context.** The old site (`ffu-app`) built with `vite-plugin-pwa` (`registerType: 'autoUpdate'`),
which registered a service worker at `/sw.js`, scope `/`, on the apex — with workbox's default SPA
navigation fallback (`createHandlerBoundToURL("index.html")`, confirmed in that repo's `dist/sw.js`).

A service worker is scoped to the ORIGIN and outlives the site that installed it. After the apex
cutover, every visitor who had loaded `ffunion.com` before the switch still had that worker
installed, and it answered **every navigation** from its own precache — serving the old HashRouter
app regardless of what GitHub Pages now returns. Symptom (reported by the commissioner): a link to
`/lineal` rendered the old site, address bar showing `ffunion.com/lineal#/members` — a new-style
path with an old-style hash route, which only the old app can produce. Neither DNS, the CDN, nor
the new deploy was involved; the new bundle and `404.html` fallback were verified correct.

**Decision.** Ship `public/sw.js` containing a kill switch: delete all caches, `unregister()`, then
`client.navigate()` open tabs. Old registrations fetch this path during their update check, so
affected browsers heal deterministically on their next visit.

**Alternatives rejected.** Leaving `/sw.js` as a 404 does eventually unregister the worker, but it
depends on browser-specific 404 handling and update throttling — slower and less certain, for a
file that costs nothing to serve. Renaming assets or busting caches doesn't help: the worker
intercepts navigations before any of that matters.

**Consequences.**
- Keep `public/sw.js` until old registrations have aged out. It has NO `fetch` handler, and this
  repo never registers a worker, so it is inert for everyone else.
- **Rule going forward: do not add a service worker / PWA plugin to this site without a plan for
  retiring it.** This class of bug is invisible to the people shipping (their browsers are clean)
  and unfixable from the server once installed.
- Deep links to `ffunion.com/*` return HTTP 404 by design — GitHub Pages serves `public/404.html`,
  which bounces through `/?/path` for BrowserRouter. `curl` showing 404 is expected, not a fault.

## 2026-08-30 — "This Week" waits for kickoff, not for Sleeper's `season_type`

**Context.** On 30 Aug — ten days before week 1 — the home page was showing a full This Week section
(matchups + standings, every score 0.00). The gate was `seasonType === 'regular'`, and Sleeper flips
that the moment the preseason ends, not when games start.

**Decision.** Gate on `state/nfl`'s `season_start_date` (`selectors/liveWeek.ts` →
`seasonHasStarted`), compared against local midnight. A missing date fails open.

**Why.** It keeps the rule *data* rather than a date hardcoded in the app — the same reason draft
dates are read from Sleeper instead of config. Nothing to remember next August.

**Consequences.** The section appears on the calendar day Sleeper names as week 1 (a day before
Thursday kickoff in 2026), showing that week's matchups pre-game — which is the intended reading of
"this week", unlike a preview standing there for a week and a half.

## 2026-08-30 — How hard the live draft board polls

**Context.** Sleeper has no push API. The board polled picks every 12s on a plain URL — but their
CDN holds `/picks` for 30s (`s-maxage=30`, verified `cf-cache-status: HIT`), so most of those
requests could only ever return an answer up to 30s stale.

**Decision.** Polled reads (`sleeperGet(..., { fresh: true })`) add a unique query parameter, which
changes the CDN cache key and is served from origin, plus `cache: 'no-store'` for the browser's own
cache. Picks poll at **5s while the draft is live** and **60s otherwise**; the draft object (status,
order, start time) polls at 30s until the draft is complete. "Live" is `draftPhase()`: Sleeper's
status, widened by a 2h window from the scheduled start so the fast poll is already running when the
commissioner presses start.

**Alternatives rejected.** *Backing off while the draft is quiet* — tempting, and backwards: a quiet
draft is a clock running on someone, i.e. precisely when everyone is staring at the board waiting.
Latency is most visible in the lull, not least. *Polling faster than 5s* — 12 drafters × a few dozen
viewers is already a few hundred origin requests a minute; the gain past 5s isn't perceptible.

**Consequences.** Cache-busting means these reads always hit Sleeper's origin, so keep them to the
two that are genuinely live and keep the idle rate low. Everything else in the app takes the cached
answer. Hidden tabs poll nothing, and both polls stop when the draft is complete.

## 2026-09-09 — The in-progress season becomes an ordinary static season

**Context.** `LeagueDataProvider` reads only `public/data`, so a season that has not been backfilled
does not exist to Stats, Standings, Members, Records, Lineal or the Cup. That is correct for the
offseason and wrong from September to January — exactly when people visit — leaving the site
reading "through 2025" all autumn. The home page's This Week section is the one live-wired place,
deliberately kept off the provider (see the header of `src/data/liveSleeper.ts`).

**Decision.** `scripts/refresh-live-season.mjs` (`npm run refresh-season`) writes the season being
played into `public/data/{year}/{tier}.json` — the same files, same shape, same validator as every
other season — and adds its rows to `seasons.json`. Run it weekly. Nothing above the data layer
changes: 2026 is just another season.

**Completed weeks only.** The week in progress is excluded. Half a Sunday's scores are still
climbing, and a team sitting on 40 points at 2pm would set an all-time low, drag its owner's career
average and move the UPR — permanently, if it were ever committed. In-progress scores stay in This
Week, which fetches them live in the browser and never writes them down. That split is what lets
both be honest at once.

**Team rows are derived here, not mirrored.** For a finished season we store Sleeper's own
aggregates as facts (`SeasonTeam` in `src/data/types.ts`). Mid-season we can't: those aggregates
move during the week we are excluding, which would leave `teams` and `games` disagreeing inside one
file — a standings table that doesn't add up to the matchups beside it. Deriving from the games we
wrote keeps the file internally consistent, and January's backfill replaces the rows with Sleeper's
finals. Checked against 2025: derived records and points-for match Sleeper's stored aggregates
exactly for all 36 teams, so nothing is lost by deriving in the Sleeper era.

**`finalPlacement` stays absent,** which is already how the domain says "unfinished" —
`standings.ts` falls back to a live sort, and `draftBuilds.ts` excludes placement-less seasons so an
in-progress team is never counted as a failure. No new "inProgress" flag was needed.

**Alternatives rejected.** *Wait for the January backfill* — free, but the site looks a season stale
for four months. *Wire `liveSleeper` into the provider* — puts a network dependency behind every
stat on the site, and needs every page to learn a second code path.

**Verification.** `npm run refresh-season -- --verify <year>` rebuilds a completed season straight
from Sleeper and diffs its regular-season games against the backfilled file. 2025, 2024 and 2022 all
reproduce exactly (252 games each). Run it after any change to the mapping.

**Consequences.** A refresh is a commit, so the season's history is in git. The script refuses to
write a year already in `SEASONS` (it would drop playoffs and final placements), and reminds you to
add the year to `src/config/seasons.ts` once its files exist — do that only after the first refresh,
since registering a year whose data is missing 404s the site.
