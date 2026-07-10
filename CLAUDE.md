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
The full rebuild plan + historical decisions live at `~/.claude/plans/ffu-rebuild-plan.md` — reference it
only if you need deep historical context. Per-phase build history lives in `git log`, not here.

The old codebase (source of logic to port + data to migrate) is at `~/Development/ffu-app`, wired in via
`.claude/settings.local.json` (`permissions.additionalDirectories: ["../ffu-app"]`) — readable every
session, no `--add-dir` needed.

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
npm run typecheck  # tsc --noEmit
npm test           # vitest
npm run migrate    # regenerate public/data from legacy-source (one-time/rare)
npm run validate   # per-game migration diff harness
```

---

## Status
**Build complete through Phase 4** (all phases 0–4 done; styling overhaul done). Pages live: Overview,
Standings, Matchups, Drafts, Records, Members (directory/detail/compare), and **Stats** (route `/stats`,
formerly "Leaderboard" — the big career-stats table: league scope + filters, column show/hide + drag
reorder, full-bleed/sticky Team column, FA icons). All gates green.

**Conventions (enforced):** ESLint caps `max-lines` 300 / `max-lines-per-function` 80 / `complexity` 12 +
`no-explicit-any`. Gates before any commit: `npm run typecheck && npm run lint && npm test`. **Commit AND
push after every green change** without being asked. Dev server is the **user's** on `:5173` — never
`pkill vite`; an agent server uses `:5199`.

**Working style:** don't over-verify with browser screenshots — they're context-expensive. The user runs
the live site and will eyeball/flag issues; only screenshot when they're away or it's genuinely ambiguous,
and trust well-tested libraries rather than proving each one visually.

**Deploy:** staging at `new.ffunion.com` (GitHub Pages, auto-deploys on push to `main`); a Cloudflare
preview at `preview.ffunion.com` serves the `auto/requests` branch (autonomous Discord-request pipeline).
Apex `ffunion.com` still serves the **old** `ffu-app` site. Setup + apex cutover checklist in `ai-docs/DEPLOY.md`;
Phase 5 (cutover + `old.ffunion.com`) is mostly pre-wired.

**Next / open:** Phase 5 cutover; optional UPR-progression line chart (All-Time horserace + Members view);
confirm ffu-035/ffu-048 (in the registry but never appear in data) belong; a couple owner first-names
(ffu-019/033) TBD. Deferred unless asked: H2H matrix, draft fun-facts, playoff machine, live active-week,
static lineup backfill.

## ai-docs/
Ops/planning docs that aren't app source live here (kept out of the repo root to cut clutter):
`ai-docs/DEPLOY.md` (deploy + apex cutover checklist), `ai-docs/PREVIEW-ENVIRONMENT.md` (Cloudflare
preview setup), `ai-docs/TODO.md` (**living task list — check it, and keep it current as work
happens**, e.g. what's left for 2026 season readiness).
