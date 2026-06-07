# Preview environment

**Goal:** when `auto/requests` updates from a Discord request, the requestor gets a **live preview
URL** in the bot's ✅ reply, so they can see the change rendered before it's merged to `main`.

GitHub Pages serves one site per repo (`main` → `new.ffunion.com`), so previews need a second host.
We use **Cloudflare Pages**, deployed **explicitly from our own GitHub Action** with `wrangler` —
*not* Cloudflare's Git auto-detection, which proved unreliable. Deploying ourselves means it's
deterministic: a failure shows up in the Actions log instead of silently not building.

## How it works

After a request lands on `auto/requests`, the workflow:
1. `npm run build` → `dist`
2. `wrangler pages deploy dist --project-name ffu-web-preview --branch auto/requests`
3. captures the resulting `*.ffu-web-preview.pages.dev` URL and includes it in the bot's ✅ reply.

The deploy step is `continue-on-error` — a preview hiccup never fails the request (the PR is already
open). `main` is untouched (GitHub Pages still owns `new.ffunion.com`); the Cloudflare project only
ever serves `auto/requests` previews.

## Setup (one-time)

Create a **Cloudflare API token** and grab your **account ID**, then add both as repo **secrets**:

1. Cloudflare → **My Profile → API Tokens → Create Token → Custom token**. Permissions:
   **Account → Cloudflare Pages → Edit**. Scope it to your account. Create → copy the token.
2. **Account ID:** Cloudflare dashboard → Workers & Pages (or any account page) → it's in the URL
   `dash.cloudflare.com/<account-id>/...` and in the right-hand sidebar.
3. Repo → Settings → Secrets and variables → Actions → **Secrets**:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

That's it — `wrangler` creates the `ffu-web-preview` Pages project on first deploy. No Cloudflare-UI
project wiring, no DNS. (The earlier `.workers.dev` Worker and any `PREVIEW_URL` variable are no
longer used and can be deleted.)

## Notes
- The deploy adds ~1–2 min per request (build + upload); the bot says "ready in ~1 min."
- Client-side routes (e.g. visiting `/standings` directly) may 404 on Cloudflare without an SPA
  fallback — the root URL + clicking around works; if deep links 404 we'll add a `_redirects` file.
- Optional later: a prettier `preview.ffunion.com` via a Namecheap CNAME to the project. Cosmetic.
