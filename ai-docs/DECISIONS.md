# Decisions

Short ADR-style notes for choices that aren't obvious from the code and would otherwise get
re-litigated. Newest first. Keep each entry to what was decided, why, and what it constrains.

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
  payout — absent until announced, and the page says "TBA" rather than guessing.
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
