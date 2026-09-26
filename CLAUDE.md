# CLAUDE.md — FFU Web (rebuild)

This file is loaded into context every session. It governs how work is done in this repo.

## What this is
A **from-scratch rebuild** of the Fantasy Football Union (FFU) site — tracking 8+ years (2018–present)
of a 3-tier (Premier / Masters / National) fantasy football league with promotion/relegation, plus
active-season support. It replaces the old `ffu-app` project (a sibling repo), which worked but became
unmaintainable: huge files, duplicated logic, dual IDs everywhere, ad-hoc era branching, dead code.

**The data is the asset; the code is the liability.** This rebuild exists to make future changes cheap,
correct, and safe — and is deliberate practice in building software *responsibly* with AI tooling.

## Background docs (don't read wholesale by default)
Per-phase build history lives in `git log`, not here. Two older sources exist **only on Josh's
laptop**, and a cloud session (the commissioner's, or Josh's own) has neither, so don't go looking:
the original rebuild plan (`~/.claude/plans/ffu-rebuild-plan.md`) and the old `ffu-app` codebase
(`~/Development/ffu-app`, the legacy source `npm run migrate` reads). Everything a change normally
needs is in this repo; if a task really needs legacy source, say so rather than guessing.

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
`base: '/'` + `404.html` SPA fallback). Styling: Tailwind v4 (`@theme` tokens in `src/index.css`; tier
colors only in `src/components/leagues.ts`). Icons: `react-icons` (Font Awesome). Drag: `@dnd-kit`. Tests:
Vitest + Testing Library + jsdom. Hosting: GitHub Pages.

## Commands
```bash
npm run dev        # Vite dev server (http://localhost:5173)
npm run build      # tsc -b && vite build
npm run lint       # eslint
npm run typecheck  # tsc -b
npm test           # vitest
npm run knip       # unused files/exports/deps (knip.json lists the intentional exceptions)
npm run migrate    # regenerate public/data from legacy-source (one-time/rare)
npm run validate   # per-game migration diff harness
```

---

## Status
**Build complete through Phase 4** (all phases 0–4 done; styling overhaul done). Pages live: Overview,
Standings (per league, plus a **Union** scope — `?scope=union`, all 36 teams of a year in one
UPR-ranked table), Matchups, Drafts, Records, **Lineal** (route `/lineal` — the boxing-style belt lineage),
Members (directory/detail/compare), **FFU Cup** (route `/cup` — the 36-team cross-league knockout;
tabbed Bracket / Format & Rules, the bracket being an empty outline until the season's draw is held),
**Around the Union** (route `/around-the-union` — the FFUN newsletter's page-2 panel: last
completed week's top 3 scorers across all leagues + the league points/PPG race, framed as one
screenshot-ready block), and **Stats** (route `/stats`,
formerly "Leaderboard" — the big career-stats table: league scope + filters, column show/hide + drag
reorder, full-bleed/sticky Team column, FA icons). Also in the Stats & More menu: **Builds**
(`/builds`, roster-construction stats by draft), **Milestone Watch** (`/milestones`), and **ADP
Comparison** (`/adp-comparison`, the live season's picks vs the other leagues and Sleeper ADP).
The Cup has an unlisted operator view, `/cup/draw`, for running the draw live on stream.

**Live season (active for 2026):** the home page has a "This Week" section (matchups + standings +
box scores, fetched client-side from Sleeper via `src/data/liveSleeper.ts` — deliberately a separate
path from `LeagueDataProvider`, see its header comment). It is on whenever
`src/config/liveSeason.ts` `LIVE_LEAGUE_IDS` has entries for the year Sleeper reports (2026 does);
empty = zero cost, section hidden. Regular season only (wks 1–14); playoffs deferred.

**Conventions (enforced):** ESLint caps `max-lines` 300 / `max-lines-per-function` 80 / `complexity` 12 +
`no-explicit-any`. Gates before any commit: `npm run typecheck && npm run lint && npm test`. **Commit AND
push after every green change** without being asked. Where it goes depends on what the change is
(see **Who pushes where** below). Dev server is the **user's** on `:5173` — never
`pkill vite`; an agent server uses `:5199`.

**Who pushes where** (Josh is the repo owner, GitHub `josh-conley`; the commissioner also works here):
- **Anything visible on the site** (pages, components, styling, selectors, live-data features): **one
  change, one branch, one PR**, so each change ships on its own:
  1. Branch `preview/<name>` from the latest `origin/main`: a short kebab-case name, 20 characters
     or fewer (e.g. `preview/playoff-odds`) so Cloudflare doesn't cut it short in the URL.
  2. Commit (gates green), push, and open a PR into `main`. `preview-deploy.yml` deploys it to
     **`https://preview-<name>.ffu-web-preview.pages.dev`** in ~1–2 min and posts that URL as the
     PR's "Preview" check. Give them the link. The preview carries a banner linking to its PR, so
     they can merge from GitHub themselves while looking at it.
  3. Follow-up tweaks to the same change go on the same branch (the preview updates on each push).
  4. Merge when they approve it, in any words ("looks good", "ship it", "merge it", a 👍), or once
     they've merged it themselves. A reply that's feedback or a question isn't approval: ask. Before
     merging, CI must be green and the branch up to date (if `main` moved and conflicts, merge
     `main` in, never rebase or force-push, and let the preview redeploy); then merge with a
     **merge commit** and delete the branch.
- **Straight to `main`**, no preview: docs (`CLAUDE.md`, `ai-docs/`), workflows and tooling,
  test-only changes, urgent fixes while the site is broken, or when he says "just ship it". **Josh
  only**: the commissioner's changes always go through a `preview/` branch and PR. A cloud session
  on its own branch fast-forwards `main` and pushes it. `deploy.yml` runs the gates before publishing, so a red commit never goes live.
- **`auto/requests`** is the Discord bot's rolling branch (served at `preview.ffunion.com`, kept in
  sync with `main` by `sync-requests.yml`). Sessions don't put their own work there.
- **Whose session is it?** Cloud sessions set `git config user.name`/`user.email` from the GitHub
  account: Josh is `josh-conley` (Josh Conley). Anyone else follows the commissioner's rules. GitHub
  backs this up: the `main` ruleset (CI's `verify` required) only lets Josh bypass it, so anyone
  else's direct push to `main` is refused, not silently published.
- Can't tell whether a change is visible, or whose session this is? Ask before pushing.

**Project preferences** (Josh's standing calls; follow them without being told again):
- **Gates:** never pipe a gate into a commit (`npm test | tail && git commit` commits a red run,
  because the chain sees `tail`'s exit code). Run gates bare, or check them in a separate call first.
- **Effort:** trivial data/config edits (a name, an id, an owner entry) are done directly. No
  generator scripts or new abstractions for them; the rigor is for logic and architecture.
- **Data:** for finished seasons, Sleeper's own aggregates (W-L-T, points for/against) are stored as
  facts and shown as-is, even where they differ by a few points from summing the games. Everything
  that is *our* notion (UPR, records, H2H, first season, ...) is derived from the games. The old
  `ffu-app` hand-kept constants were often wrong (e.g. join year for 43 of 63 members): cross-check
  anything ported from it against the data.
- **Look:** square corners on tables and new cards/banners (plain `border border-border`). Don't add
  the angular cut/`decal` motif to new UI; it stays only on `MemberDetail` and `NotFound`, and the
  nav is motif-free. Keep semantic colors (green winner/Active, the QB/RB/WR position colors).
  Shared button/select styles live in `src/components/controls.ts`.
- **Tables stay tables** on a phone: horizontal scroll (a pinned first column is fine), never a
  stacked-card layout. Two deliberate exceptions: the home page has no horizontal scroll anywhere
  (`DataTable`'s `fit` mode), and its per-league standings put record and points under the team
  name. Don't generalise either to the wide pages.

**Working style:** don't over-verify with browser screenshots — they're context-expensive. The user runs
the live site and will eyeball/flag issues; only screenshot when they're away or it's genuinely ambiguous,
and trust well-tested libraries rather than proving each one visually.

**Deploy:** production is the apex **`ffunion.com`** (GitHub Pages, auto-deploys on push to `main` —
the cutover from the old `ffu-app` site is done). A Cloudflare preview at `preview.ffunion.com` serves
the `auto/requests` branch (autonomous Discord-request pipeline); each `preview/<name>` branch gets
its own `preview-<name>.ffu-web-preview.pages.dev` (see Who pushes where). `new.ffunion.com` and
`old.ffunion.com` are NOT in use — neither resolves; don't cite them as URLs. Details in
`ai-docs/DEPLOY.md`.

**Next / open:** optional UPR-progression line chart (All-Time horserace + Members view);
confirm ffu-035/ffu-048 (in the registry but never appear in data) belong; a couple owner first-names
(ffu-019/033) TBD. Deferred unless asked: H2H matrix, draft fun-facts, playoff machine, live playoff
weeks (15–17). 2026-readiness checklist lives in `ai-docs/TODO.md`.

**Weekly data refresh:** `.github/workflows/refresh-season.yml` (Tuesdays, Sep–Dec) runs
refresh-season → backfill-drafts → backfill-lineups for the live year, gates it, commits and
starts the deploy. It replaced a claude.ai routine on 2026-09-17; details in `ai-docs/TODO.md`.

## ai-docs/
Ops/planning docs that aren't app source live here (kept out of the repo root to cut clutter):
`ai-docs/DEPLOY.md` (deploy + apex cutover checklist), `ai-docs/PREVIEW-ENVIRONMENT.md` (Cloudflare
preview setup), `ai-docs/TODO.md` (**living task list — check it, and keep it current as work
happens**, e.g. what's left for 2026 season readiness), `ai-docs/DECISIONS.md` (short ADR notes for
non-obvious choices — e.g. when a season counts as "started"; add an entry rather than re-deciding),
`ai-docs/IDEAS.md` (pitched ideas + Josh's verdicts; log a line after he reacts to a pitch).

## Idea agents
`.claude/agents/product-owner.md` (features/stats, in the commissioner's mold) and
`.claude/agents/ux-partner.md` (UI/UX, a11y, mobile) are read-only subagents that pitch ranked ideas.
Together they're the **agent partners**: when Josh mentions the partners or asks broadly what to do
next, run the `partners` skill (pitch → cross-talk → converge) rather than relaying two separate
lists. A narrow ask ("UX pass on Standings") can go to one agent alone. Specialists the partners
proposed, pulled in when a pass touches their area: `perf-specialist` (load speed, bundles, data
loading) and `sports-statistician` (soundness and honest presentation of stats and models). Nothing gets built until he
picks.
