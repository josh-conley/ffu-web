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

The old codebase (source of logic to port + data to migrate) is at `~/Development/ffu-app`. Run Claude in
this repo with `--add-dir ~/Development/ffu-app` to read it without polluting this repo's git history.

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
tier-seasons** (per-game members+scores, seed/record/points/placement/promo/releg, derived high/low,
drafts). Run via `npm run migrate` / `npm run validate`.
- Data realities (differ from plan assumptions): **divisions exist only in 2025**; legacy standings
  high/low span ALL games incl. playoffs (not regular-season only).
- `legacy-source/` kept (gitignored) until the schema is locked through Phase 2/3, then delete.

**Next — finish Phase 1 tail + Phase 2 (data layer):**
- Carry over reference data (`public/data/players`, `public/data/historical-teams`, `public/team-logos`)
  from `ffu-app` (needed by Drafts/roster, deferred from Phase 0).
- Author the TS config source of truth (`members.ts`/`seasons.ts`) + emit JSON mirror; build
  `LeagueDataProvider`/`StaticFileProvider` (async, domain-phrased) + `LineupProvider`; thin hooks.
- **Owner names still needed from user** to populate the `Owner[]` model (display-only; not blocking).

## Open items needed from the user
- **Owner names** (first name + last initial per `ffuId`) for the new `Owner` model; confirm the co-owned
  "Team Dogecoin" primary/secondary owners and which merged identity wins.
- **Domain name + registrar** for the DNS/CNAME/Pages setup.

## Possibly relevant
`~/Development/ffu-sleeper-service` is a sibling project that may be an existing Sleeper backend/proxy — worth
reviewing as a candidate for the future `ApiProvider` before building the data layer.
