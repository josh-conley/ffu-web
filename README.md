# FFU Web

The site for the **Fantasy Football Union**: a 36-team, three-tier league (Premier / Masters /
National) with promotion and relegation, played since 2018. It holds every season's history and
follows the current one live. Production is **[ffunion.com](https://ffunion.com)**.

This is a from-scratch rebuild of the old `ffu-app` site. Its rules (strict layering, one identity,
derived data never stored, small tested units) are in [`CLAUDE.md`](CLAUDE.md).

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

Node 22+. There's no backend: the app reads static JSON from `public/data/`, and during a live season
it also reads the public Sleeper API from the browser.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production build into `dist/` |
| `npm run typecheck` / `lint` / `test` | The three gates. CI runs all three plus the build, and nothing merges red |
| `npm run knip` | Finds unused files, exports and dependencies (config in `knip.json`) |
| `npm run refresh-season` | Writes the live season's completed weeks into `public/data/<year>/` (a GitHub Action runs this weekly) |
| `npm run backfill-drafts` / `backfill-lineups` / `backfill-adp` | Snapshots drafts, lineups and Sleeper ADP from Sleeper |
| `npm run draw-cup -- --seed <n>` | Holds the FFU Cup draw (`--dry-run` to rehearse) |
| `npm run migrate` / `validate` | One-time legacy migration and its diff harness. Needs the gitignored `legacy-source/` |

## Layout

```
src/
  config/     hand-authored source of truth: members (ffuId registry), seasons, prizes, Cup rules, live league ids
  data/       the only data boundary: domain types, the static-file provider, live Sleeper fetchers
  selectors/  pure derivations: standings, UPR, records, H2H, careers, Cup bracket (unit-tested)
  hooks/      React wrappers over the provider plus UI state (URL filters, polling, theme)
  components/ small presentational pieces
  pages/      thin route-level composition
  lib/        framework-free helpers shared with scripts (Cup draw algorithm, image copy)
scripts/      data pipeline (Node, .mjs). Pure mapping lives in scripts/lib and is unit-tested
public/data/  the league's data: one JSON file per tier-season, plus drafts, lineups, players
automation/   Discord → PR request pipeline (see its README)
ai-docs/      deploy notes, decisions (ADRs), and the living TODO
```

Each layer only imports from the layer beneath it: config → data → selectors → components → pages.

## Docs

- [`ai-docs/TODO.md`](ai-docs/TODO.md): the living task list
- [`ai-docs/DECISIONS.md`](ai-docs/DECISIONS.md): why the non-obvious things are the way they are
- [`ai-docs/DEPLOY.md`](ai-docs/DEPLOY.md): GitHub Pages hosting, DNS, and deploy gotchas
- [`ai-docs/PREVIEW-ENVIRONMENT.md`](ai-docs/PREVIEW-ENVIRONMENT.md): the Cloudflare preview for `auto/requests`
- [`automation/discord-requests/README.md`](automation/discord-requests/README.md): the commissioner's request bot
