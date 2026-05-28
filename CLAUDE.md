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

## Status (as of initial scaffold)
**Phase 0 (scaffold) — in progress.** Done: Vite React-TS app created; deps installed (react-router-dom,
tailwindcss + @tailwindcss/vite, vitest + @vitest/coverage-v8 + jsdom + Testing Library); base configs are
the create-vite defaults; this CLAUDE.md added.

**Finish Phase 0 next (first task next session):**
- Enable full TS `strict` (the generated tsconfig.app.json lacks `"strict": true`); add `noUncheckedIndexedAccess`; add `@/*` path alias.
- `vite.config.ts`: add Tailwind plugin, `@` alias, `base: '/'`, and Vitest config (jsdom + setup file).
- ESLint flat config: add `max-lines`, `max-lines-per-function`, `complexity` rules; vitest globals for tests.
- Tailwind v4 entry CSS (`@import "tailwindcss";`) + dark-mode variant; remove create-vite demo boilerplate.
- Create folder structure `src/{config,data,selectors,hooks,components,pages}` + a minimal BrowserRouter shell + `public/404.html`.
- `package.json` scripts: `test`, `test:coverage`, `typecheck`.
- `.github/workflows/ci.yml`: install → lint → typecheck → test → build.

**Then Phase 1 (the real first milestone):** copy old inputs into a throwaway `legacy-source/` (old
`public/data` + `constants.ts`), define normalized domain types, write `migrate-to-v2` + a **per-game**
validation harness (zero-diff vs legacy) before any UI. See the plan for the full schema.

## Open items needed from the user
- **Owner names** (first name + last initial per `ffuId`) for the new `Owner` model; confirm the co-owned
  "Team Dogecoin" primary/secondary owners and which merged identity wins.
- **Domain name + registrar** for the DNS/CNAME/Pages setup.

## Possibly relevant
`~/Development/ffu-sleeper-service` is a sibling project that may be an existing Sleeper backend/proxy — worth
reviewing as a candidate for the future `ApiProvider` before building the data layer.
