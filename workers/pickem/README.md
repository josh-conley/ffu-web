# Cup pick'em API

The site's only server-side piece: a Cloudflare Worker with a D1 (SQLite) database that stores
members' FFU Cup pick'em brackets. Everything else on ffunion.com stays static on GitHub Pages.
The page calls this from the Cup's **Pick'em** tab (`src/components/cup/pickem/`).

## What it enforces
- Only the Cup's 36 teams can enter, one entry per team (`year` + `ffuId` is the primary key).
- An entry must be a complete bracket that fits the draw. `validatePicks` in
  `src/lib/cupPickem.ts` checks it, and the page uses the same function, so the two can't disagree.
- A team's first save sets its **PIN** (4–8 digits, stored only as a salted hash). Saving again,
  or loading the bracket back to edit it (say, on another device), needs that PIN.
- By Josh's call (2026-10-13), wrong PINs are not capped and there is no admin route: a member
  with a problem asks in Discord, and Josh deletes their entry (Operations, below).
- Nothing is written after the lock, and nobody sees anyone's picks until then.

The field, the bracket and the lock time are read from the live site's own
`/data/{year}/tournament.json` (cached for a minute), so the Worker has no copy of them to keep in sync.

## Turning it on for a season
1. The draw lands in `public/data/{year}/tournament.json` (`npm run draw-cup`).
2. Add `"pickemLocksAt": "<ISO instant>"` to that file, normally the Round of 36's first kickoff
   (e.g. `"2026-10-16T00:15:00Z"` = Thu 8:15pm ET). **This field is the switch:** the Pick'em tab
   appears and entries open once it's on `main`. Moving it moves the lock.
3. After the lock, the tab turns into a live leaderboard, scored from the played bracket.

## One-time Cloudflare setup (Josh)
1. The existing `CLOUDFLARE_API_TOKEN` secret only has Pages rights. Edit the token in Cloudflare
   (My Profile → API Tokens) and add **Account → Workers Scripts → Edit** and
   **Account → D1 → Edit**.
2. Add a repo **variable** (not a secret) `PICKEM_DEPLOY` = `true`. Until it's set, the deploy
   workflow skips itself, so merging before this setup is harmless.
3. Run **Deploy pick'em API** from the Actions tab (or push a change under `workers/pickem`). It
   creates the database on its first run, applies `migrations/`, deploys, and prints the Worker's
   `*.workers.dev` URL in the run summary.
4. Put that URL in `CUP_PICKEM_API` (`src/config/cup.ts`) and push. Until then the tab stays hidden.

## Operations
- **Forgotten PIN, or someone saved under the wrong name:** delete that entry, and its owner
  enters again with a new PIN. In the Cloudflare dashboard, open the `ffu-pickem` D1 database's
  **Console** and run `DELETE FROM entries WHERE year = '2026' AND ffu_id = '<ffuId>'` (the
  `ffuId` is in `src/config`; the Console's `SELECT ffu_id, updated_at FROM entries` lists them).
- **Look at the data:** `npx wrangler@4 d1 execute ffu-pickem --remote --command "SELECT ffu_id, updated_at FROM entries"`
- **Local run:** `npx wrangler@4 d1 migrations apply ffu-pickem --local`, then
  `npx wrangler@4 dev --var DATA_ORIGIN:http://localhost:5173` from this folder.

## Known limits (accepted)
- No accounts. Whoever saves a team first sets its PIN; a wrong claim is fixed by deleting it.
- With no cap on wrong PINs, a script could find a 4-digit PIN in minutes. The PIN is there to
  stop a member picking someone else's name by mistake or for a laugh, not a determined attacker.
  If that ever happens, the earlier version in git history (before `f03c6ac`) capped wrong tries.
