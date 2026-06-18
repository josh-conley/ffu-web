---
name: feature-by-layers
description: How to add a feature in ffu-web without breaking the strict layering (config → data provider → selectors → components → pages). Use when adding or extending a page, stat, selector, derived metric, data field, table, or chart — so each piece lands in exactly one layer, derived data stays derived, logic is tested alongside, and the gates pass.
---

# Adding a feature, by the layers

ffu-web is strictly layered (CLAUDE.md Charter). Build downward-to-upward; each piece lives in
exactly ONE layer and is imported across — no layer reaches past its neighbor.

## Layers (source of truth → screen)
1. **config** (`src/config`) — members, seasons, eras. Platform/Sleeper ids live ONLY here (and in
   migration). Everywhere else there is one identity: `ffuId`.
2. **data provider** (`src/data`) — the ONLY data boundary (async, domain-phrased). It owns 100% of
   source→type mapping. New field? Add it to `types.ts` + map it in the provider so a future
   static→API swap stays a one-file change. Nothing else reads raw JSON.
3. **selectors** (`src/selectors`) — pure, memoized derivations (ranking, UPR, records, H2H, career).
   **Derived data is never stored** — always computed here. Write the Vitest `*.test.ts` *alongside*
   the selector, in the same change.
4. **components** (`src/components`) — small, presentational, single-responsibility. Tier colors come
   from `leagues.ts`, position colors from `positions.ts`, form controls from `controls.ts` — never
   inline or re-derived.
5. **pages** (`src/pages`) — thin composition only. No `fetch`, no business logic in JSX.

## Before adding anything — reuse first (Charter DRY)
These each already have ONE home; import, don't re-implement:
team-name resolution (`nameForYear`/`config`), tier presentation (`leagues.ts`), position
presentation (`positions.ts`), UPR / ranking / records / career (`selectors`), shared table + filter
machinery (`DataTable`, `useFilters`, `FilterBar`), the angular/decal motif (`index.css`).

## Checklist
- [ ] New data field → `src/data/types.ts` + provider mapping (only there).
- [ ] New derived stat → pure fn in `src/selectors` + `*.test.ts` next to it. Never stored.
- [ ] Domain facts vs our notions: mirror genuine Sleeper aggregates as stored; DERIVE our-own
      notions (UPR/H2H/records, joinedYear, etc.) from migrated games — don't trust legacy constants.
- [ ] UI in small components; tier/position/control styling pulled from their single sources.
- [ ] If it's a page: add the route + wire `src/components/nav.ts`; thin page, tests for the page.
- [ ] Tables stay tabular (horizontal scroll on mobile) — no card/stacked layout swap.
- [ ] ESLint caps respected: max-lines 300 / per-function 80 / complexity 12; no `any`.
- [ ] Gates green: `npm run typecheck && npm run lint && npm test` (never pipe `| tail` — it masks
      the failing exit code).
- [ ] Commit AND push, small and reviewable. If on `main`, branch first.

## Layering smells (stop and refactor)
- `fetch` / raw JSON access anywhere outside `src/data`.
- A stat computed inside a component, or a derived value written into config/data.
- Tier or position colors hardcoded in a component instead of `leagues.ts` / `positions.ts`.
- Platform/dual ids leaking past config + migration.
- A page over ~300 lines doing data + logic + presentation at once (the old `ffu-app` failure mode).
