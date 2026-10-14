# Cup pick'em API

The site's only server-side piece: a Cloudflare Worker with a D1 (SQLite) database that stores
members' FFU Cup pick'em brackets. Everything else on ffunion.com stays static on GitHub Pages.
The page calls this from the Cup's **Pick'em** tab (`src/components/cup/pickem/`).

## What it enforces
- Only the Cup's 36 teams can enter, one entry per team (`year` + `ffuId` is the primary key).
- An entry must be a complete bracket that fits the draw. `validatePicks` in
  `src/lib/cupPickem.ts` checks it, and the page uses the same function, so the two can't disagree.
- No PIN, by Josh's call (2026-10-14): a member chooses who they are from the list, and saving
  replaces that team's entry. The page keeps a member's bracket in their browser to edit it, so
  the API never hands anyone's picks back before the lock.
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
2. Optional: add a repo secret `PICKEM_ADMIN_TOKEN` (any long random string) to enable the
   commissioner reset below.
3. Add a repo **variable** (not a secret) `PICKEM_DEPLOY` = `true`. Until it's set, the deploy
   workflow skips itself, so merging before this setup is harmless.
4. Run **Deploy pick'em API** from the Actions tab (or push a change under `workers/pickem`). It
   creates the database on its first run, applies `migrations/`, deploys, and prints the Worker's
   `*.workers.dev` URL in the run summary.
5. Put that URL in `CUP_PICKEM_API` (`src/config/cup.ts`) and push. Until then the tab stays hidden.

## Operations
- **Someone saved under the wrong name:** delete that entry, and its owner can enter again:
  `curl -X DELETE -H "Authorization: Bearer $PICKEM_ADMIN_TOKEN" <api>/v1/2026/entries/<ffuId>`
- **Look at the data:** `npx wrangler@4 d1 execute ffu-pickem --remote --command "SELECT ffu_id, updated_at FROM entries"`
- **Local run:** `npx wrangler@4 d1 migrations apply ffu-pickem --local`, then
  `npx wrangler@4 dev --var DATA_ORIGIN:http://localhost:5173` from this folder.

## Known limits (accepted)
- No accounts and no PIN, so anyone can save over anyone's bracket by choosing their name. Fine
  among league members; if it's ever abused, the fix is to bring back a PIN (git history has one:
  hashed, with a capped number of tries) rather than to police it by hand.
- Your bracket is remembered in the browser you made it in. On another device you start over,
  and saving replaces what you had.
