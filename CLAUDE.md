# CLAUDE.md — FFU Web (rebuild)

This file is loaded into context every session. It governs how work is done in this repo.

## What this is
A **from-scratch rebuild** of the Fantasy Football Union (FFU) site — a site tracking 8+ years (2018–present)
of a 3-tier (Premier / Masters / National) fantasy football league with promotion/relegation, plus
active-season support. It replaces the old `ffu-app` project (a sibling repo), which worked but became
unmaintainable: huge files, duplicated logic, dual IDs everywhere, ad-hoc era branching, dead code.

**The data is the asset; the code is the liability.** This rebuild exists to make future changes cheap,
correct, and safe — and is deliberate practice in building software *responsibly* with AI tooling.

## The full plan lives outside this repo
The complete rebuild plan + all prior context, decisions, data-model design, and execution phases is at:
**`~/.claude/plans/ffu-rebuild-plan.md`** — read it in full before doing substantial work.

The old codebase (source of logic to port + data to migrate) is at `~/Development/ffu-app`. It's wired into
this repo as an additional directory via `.claude/settings.local.json` (`permissions.additionalDirectories:
["../ffu-app"]`), so every session can read it automatically — **no `--add-dir` flag needed**. (That file is
gitignored + read at session start, so the access applies from the next session after it's set.)

---

## Engineering Charter (non-negotiable)
Speed never justifies a shortcut that costs maintainability — that exact tradeoff is what made the old
codebase unworkable. Every decision is made for the long term and must be defensible.

1. **No "just make it work."** If a quick hack is tempting, do it properly or write the debt down explicitly
   (issue/TODO + rationale) and get agreement. Hidden shortcuts are the failure mode we're escaping.
2. **Small, single-responsibility units.** Files/functions stay small and focused; enforced via an ESLint
   max-lines / complexity rule (no more 1300-line pages). Composition over monoliths.
3. **DRY by construction.** Each piece of logic (UPR, ranking, records, team-name resolution, league colors)
   lives in exactly one place and is imported — never copy-pasted.
4. **Types first; no `any` escape hatches.** Model the domain precisely; let the compiler enforce invariants.
5. **Pure, tested core.** Derived stats are pure functions with Vitest unit tests, written *alongside* the
   code. Business logic stays out of React components.
6. **Strict layering, honored.** config → data provider → selectors → components → pages. No layer reaches
   past its neighbor (no `fetch` in components, no business logic in JSX).
7. **Document the "why."** Non-obvious decisions get a short comment or ADR note.
8. **Use the tooling deliberately.** Lean on skills and subagents (Explore/Plan); run `/code-review` and
   `/security-review` before merging and before any backend/API work.
9. **Best practices per domain.** Idiomatic modern React (hooks, measured memoization, a11y, semantic HTML);
   for any future backend/API: input validation, least-privilege secrets, no creds in the client, proper
   error handling, reviewed before shipping.
10. **Incremental, reviewable changes.** Small PRs, clear commits; CI runs lint + typecheck + tests; nothing
    merges red. Verify behavior by running it — don't assume.
11. **Accountability.** Surface concerns, push back on shortcuts (including the user's), and flag when
    something is being done expediently rather than well. **Honesty over agreeableness.**

---

## Architecture (strict layers)
```
config (TS source of truth: members, seasons; + emitted JSON mirror)
   → data provider (LeagueDataProvider / LineupProvider — the ONLY data boundary; async; domain-phrased)
      → selectors (pure, memoized: ranking, UPR, records, H2H, career — NEVER stored, always derived)
         → components (small, presentational)
            → pages (thin composition)
```
Rules: **one identity — `ffuId`** (platform ids only in config + migration); **derived data is never
stored**; **era is data, not branching** (each season file carries its own metadata); **the provider owns
100% of source→type mapping** so swapping static→API later is a one-file change.

Folder layout: `src/{config,data,selectors,hooks,components,pages}`.

## Tech stack
React 19 + TypeScript (strict) + Vite. Router: react-router-dom (BrowserRouter; custom domain at root, so
`base: '/'` and a `404.html` SPA fallback — NOT the old hash-router/`/ffu-app/` setup). Styling: Tailwind v4
(`@tailwindcss/vite`). Tests: Vitest + Testing Library + jsdom. Hosting: GitHub Pages (public repo) at the
main custom domain; the old site will be rehomed to `old.<domain>`.

## Commands
```bash
npm run dev       # Vite dev server
npm run build     # tsc -b && vite build
npm run lint      # eslint
npm run preview   # preview production build
# (test / typecheck / coverage scripts to be wired while finishing Phase 0 — see Status)
```

---

## Status
**Phase 0 (scaffold) — ✅ complete** (commit `ba3e443`). Full TS `strict` + `noUncheckedIndexedAccess` +
`@/*` alias; `vite.config.ts` wired with Tailwind v4, base `'/'`, and Vitest (jsdom + `src/test/setup.ts`);
ESLint caps `max-lines` (300) / `max-lines-per-function` (80) / `complexity` (12) + `no-explicit-any`, with
vitest globals for tests; Tailwind entry CSS w/ class-based `dark` variant; layer folders
`src/{config,data,selectors,hooks,components,pages}` (each with a README); minimal BrowserRouter shell
(`Layout` + `Overview`) + a smoke test; `public/404.html` SPA fallback + index.html redirect decoder;
scripts `test`/`test:coverage`/`typecheck`; CI (`lint → typecheck → test → build`). All four gates green.

**Phase 1 (the big de-risk) — ✅ core complete** (commits `b88fd48`, `4484ace`). Normalized domain types
authored (`src/config/types.ts`, `src/data/types.ts`); throwaway `legacy-source/` snapshot in place
(gitignored); `scripts/migrate-to-v2.mjs` emits 20 normalized seasons + 20 drafts + `seasons.json` into
`public/data`, collapsing dual IDs to one `ffuId` and merging Team Dogecoin (ffu-032→**ffu-031**, confirmed
w/ user); `scripts/validate-migration.mjs` is the per-game harness → **zero diffs across all 20
tier-seasons** (per-game members+scores, record/points/finalPlacement/promo/releg, derived high/low,
drafts). Run via `npm run migrate` / `npm run validate`.
- Data realities (differ from plan assumptions): **divisions exist only in 2025**; legacy standings
  high/low span ALL games incl. playoffs (not regular-season only). **Legacy `standings[].rank` is the
  final post-playoff placement** (== `playoffResults.placement` in all 240 entries), NOT a regular-season
  seed → it maps to `finalPlacement`. Regular-season `record`/`points` are stored; the regular-season
  *seed* (division leaders + H2H tiebreakers) is deliberately NOT stored — it's a derived, active-season
  playoff concern (deferred).
- `legacy-source/` kept (gitignored) until the schema is locked through Phase 2/3, then delete.

**Phase 2 (data layer) — ✅ core complete** (commits `ad06ed4`, `5834a09`).
- **Config** (`src/config/`): `members.ts` (63 franchises, ffu-031 holds both Dogecoin accounts),
  `seasons.ts` (20 tier-seasons, era + hasDivisions folded in), `eras.ts` (single reader of era rules),
  `index.ts` helpers (`getMember`, `nameForYear`, `memberBySleeperId`, `getSeasonMeta`, `tiersForYear`) +
  tests. Data files are pure/regenerable; helpers separate.
- **Provider + hooks** (`src/data/`, `src/hooks/`): `LeagueDataProvider` (async, domain-phrased) +
  `StaticFileProvider` (reads `public/data`, coalesces reads, validates at the boundary via `validate.ts`) +
  `provider` singleton; `useSeasons`/`useSeason`/`useDraft` over `useAsyncData`. Tested against real files.
- **Deliberate deviations from plan (documented why):** (a) TS config is imported directly (typed, sync)
  rather than fetched as a JSON mirror — the mirror is deferred (no consumer until a real backend); (b)
  reference-data carry-over (players 30MB / historical-teams / team-logos) deferred to Phase 4 where the
  consumers + size/naming decisions live; (c) `LineupProvider` deferred (post-core roster modal).
- **Owner names still needed from user** to populate `Member.owners[]` (stubbed `[]`; display-only, not blocking).

**Phase 3 (selectors) — ✅ complete** (commits `a9dfea8`, `a5ab489`, `281b399`, `9e31456`). Pure, tested
derivations over validated data (`src/selectors/`, barrel `index.ts`; 40 tests):
- `games.ts` — winner/tie/margin + `regularSeasonTotals` (derive-from-symmetric-participants base).
- `upr.ts` — UPR ported verbatim over regular-season games.
- `records.ts` — all-time high/low/blowout/closest/combined (`buildRecordBook`).
- `standings.ts` — regular-season ordering (winPct→pointsFor, tie-aware) + division grouping, using the
  STORED Sleeper record/points for display.
- `headToHead.ts` — pairwise H2H across seasons. `career.ts` — career totals/championships/best finish.
- **Key modeling decision** (see memory `sleeper-aggregates-stored-not-derived`): Sleeper's season
  aggregates (`record`/`points`) stay STORED and are used for display; we derive only OUR stats from
  games. H2H tiebreaker + division-leader playoff seeding (top-2 + 3rd-leader bump) are deferred
  (active-season-only in legacy).

**Phase 4 (core UI) — in progress.** Done so far:
- **Shell** (commit `804de67`): `Header` (nav + theme toggle), `Layout`, `useTheme` (class-based dark,
  FOUC-prevented via inline script in `index.html`), `LoadingSpinner`, `ErrorMessage`, `LeagueBadge` +
  single `LEAGUE_STYLES` color map, `TeamLogo` (serves `/team-logos/{ffuId}.png`, abbreviation fallback).
  Carried over 41 team logos renamed to `{ffuId}.png` (unmatched/historical members use the fallback).
- **Standings slice** (commit `f1b84df`): `useUrlState` (one uniform `?year=&tier=` helper),
  `SeasonLeaguePicker`, `StandingsTable`, `Standings` page + `/standings` route. Loads manifest → latest
  season; groups by division (2025) else flat table; uses `standings` + `seasonUpr` selectors. Integration
  test renders real 2025 data. **Verified in a real browser** (Chrome headless screenshots): 2025 divisions
  + 2019 ESPN flat/2-tier both correct; seed visibly decoupled from finish; historical names + logo
  fallbacks working. 41 tests, all gates green.

- **Shared season flow** (commit `649c751`): `useSeasonView` hook (manifest → `?year=&tier=` → season,
  with an `enabled` flag on `useAsyncData`) — used by Standings + Matchups.
- **Matchups slice** (commit `e179db1`): `gamesByWeek` selector + `MatchupCard`; `/matchups` route. Week
  sections of matchup cards (winner emphasized, playoff round label). Integration test.
- **Records slice + DataTable** (commit `adbdf8b`): generic sortable/paginated **`DataTable`** primitive;
  `useAllSeasons` hook; Records page with 6 leaderboards (`?record=`) over `buildRecordBook`.
- **Members slice** (commit `7da3a83`): `memberSeasons` selector; `MembersDirectory` (sortable career grid)
  + `MemberDetail` (header w/ owner + derived tenure + Active badge, stat tiles, season history); `?member=`
  URL state. Route /members. Verified in browser.
- **Members compare** (commit `8442602`): `MemberSelect` + `MemberCompare` (side-by-side career +
  head-to-head via `headToHead`); `?member=&vs=` URL state (atomic via `useSearchParams`).
- **Overview + All-Time** (commit `8514471`): `careerUpr` selector; Overview champions matrix (year × tier);
  All-Time leaderboard (`/all-time`) sortable on seasons/record/win%/PF/titles/playoff apps/career UPR.
- **Owner data**: `OWNERS` registry (`owners.ts`, ids mirror ffuId) + `ownerNames` (last initial only when a
  first name is shared); names populated by user incl. Team Dogecoin co-owners. ffu-019/033 first names TBD.
- **Derived, not stored** (legacy constants unreliable — memory `legacy-constants-values-are-unreliable`):
  `joinedYear` + `isActive` removed from Member; `careerStats` derives `firstYear`/`lastYear`/`isActive`.
- **Data note**: ffu-035 (ZBoser) & ffu-048 (dewdoc) are in the config registry but never appear in any
  season's data → excluded from career/all-time views. (Confirm whether they should be in the registry.)
- **All pages live; 52 tests, all gates green.** Pages: Overview, Standings, Matchups, Records, Members
  (directory/detail/compare), All-Time.

- **Drafts** (commit `5f6616e`): `DraftBoard` (rounds × slots grid) + `DraftList` (sortable) from the
  embedded `*.draft.json` (no player-pool carry-over needed); season picker + board/list toggle. Extracted
  `useSeasonPicker` from `useSeasonView`. Route /drafts. **54 tests.**

**Phase 4 core UI — ✅ complete.** All 7 pages live: Overview, Standings, Matchups, Records, Drafts,
Members (directory/detail/compare), All-Time.

**▶ NEXT (top priority, per user 2026-05-29): STYLING OVERHAUL before cutover.** Site looks bland; borrow
the OLD site's design language + color scheme (live at `ffunion.com`) with a fresh modern twist. Immediate
step: a **UI/UX design agent was mid-spawn when the prior session ended (interrupted before it ran — no
saved state); launch it fresh** for a design-system proposal + samples, then implement (Tailwind v4 `@theme`
tokens in `src/index.css`; league colors stay in `src/components/leagues.ts`). **Full handoff + the
ready-to-spawn agent prompt are in memory `styling-overhaul-handoff` — read it first.** (User deprioritized
the progression chart + minor refinements below.)

**Resume here — remaining (polish / Phase 5):**
1. **Progression/line chart** component (last shared primitive, optional) → All-Time **UPR horserace** +
   Members season-progression view.
2. **Optional refinements**: All-Time career UPR has no min-seasons qualifier (low-season members top it);
   `historicalTeam` (precise draft-year NFL team) deferred — would need `players`/`historical-teams` carry-over;
   confirm ffu-035/ffu-048 (never appear in data) belong in the registry; fill remaining owner names.
3. **Phase 5 — cutover** (mostly pre-wired; see `DEPLOY.md`): point apex `ffunion.com` → this repo, old →
   `old.ffunion.com`. Deferred-from-core (out of scope unless requested): H2H Matrix, Draft Fun Facts,
   Playoff Machine, live active-week features, static lineup backfill.
- To run locally: `npm run dev` → http://localhost:5173 (screenshot via installed Chrome headless:
  `--headless=new --screenshot=out.png <url>`).

**Deploy (done early, out of plan order):** staging site **live at `new.ffunion.com`** (GitHub Pages,
auto-deploys on push to `main` via `.github/workflows/deploy.yml`); apex `ffunion.com` still serves the
old `ffu-app` site untouched. Full setup, gotchas, and the apex **cutover checklist** are in `DEPLOY.md`.
Phase 5 (cutover + `old.<domain>`) is now mostly pre-wired.

## Open items needed from the user
- **Owner names** (first name + last initial per `ffuId`) for the new `Owner` model; confirm the co-owned
  "Team Dogecoin" primary/secondary owners and which merged identity wins.
- **Domain name + registrar** for the DNS/CNAME/Pages setup.

## Possibly relevant
`~/Development/ffu-sleeper-service` is a sibling project that may be an existing Sleeper backend/proxy — worth
reviewing as a candidate for the future `ApiProvider` before building the data layer.
