# Preview environment

**Goal:** when `auto/requests` updates from a Discord request, the requestor gets a **live preview
URL** in the bot's ✅ reply, so they can see the change rendered before it's merged to `main`.

GitHub Pages only serves one site per repo (`main` → `new.ffunion.com`, owned by `deploy.yml`), so
previews need a second host. **Cloudflare Pages** is the fit: native per-branch preview deploys, free
tier (500 builds/mo), same build (`npm run build` → `dist`), no changes to GitHub Pages.

## How it works

| URL | Host | Branch | Trigger |
|---|---|---|---|
| `new.ffunion.com` | GitHub Pages | `main` | `deploy.yml` |
| `auto-requests.<project>.pages.dev` | Cloudflare Pages | `auto/requests` | Cloudflare auto-builds on push |

Cloudflare gives each branch a **stable alias** (`<branch-slug>.<project>.pages.dev`, `/`→`-`), so
`auto/requests` is always reachable at the same URL — it survives the branch resetting between batches.

## Status

- ✅ **Code (done):** the bot's success reply appends `🔍 Live preview: <url>` when the repo variable
  **`PREVIEW_URL`** is set (`discord.mjs` `done()` + the workflow's Report-success step). Empty = the
  line is omitted, so this is a no-op until configured.
- ⏳ **Setup (manual, one-time):** create the Cloudflare Pages project + set `PREVIEW_URL`.

## One-time setup

1. **Cloudflare account** (free) → **Workers & Pages** → **Create** → **Pages** → connect the
   `ffu-web` GitHub repo.
2. Build settings: build command `npm run build`, output dir `dist`, env var `NODE_VERSION=22`.
   Leave `main` as the production branch (its Cloudflare URL just goes unused — GitHub Pages still
   serves `new.ffunion.com`). Enable preview deployments for all branches (default).
3. After the first build, grab the project name and confirm `https://auto-requests.<project>.pages.dev`
   loads the `auto/requests` branch.
4. Add a repo **variable** (Settings → Secrets and variables → Actions → **Variables**):
   `PREVIEW_URL = https://auto-requests.<project>.pages.dev`. Done — the next request's reply links it.

**Optional:** a prettier `preview.ffunion.com` via a Namecheap `CNAME` (`preview` → `<project>.pages.dev`)
plus a Cloudflare custom-domain mapping. Start with the `.pages.dev` alias; the custom domain is just
cosmetics and can come later.

> The DNS for `ffunion.com` is at **Namecheap** (see `DEPLOY.md`), not Cloudflare — the `.pages.dev`
> alias needs no DNS at all, which is why it's the recommended starting point.
