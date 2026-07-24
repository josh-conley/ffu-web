# Deployment

Hosting: **GitHub Pages** (free, public repo) via the GitHub **Actions** flow
(`.github/workflows/deploy.yml`) — auto-deploys on every push to `main`.

## Current state (target — apex cutover)

| URL | Repo | Notes |
|---|---|---|
| `ffunion.com` (apex) | `ffu-web` (this repo) | Production. |
| `old.ffunion.com` | `ffu-app` (old) | Archived old site. |

DNS is at **Namecheap**. The apex `A` records point at GitHub's shared Pages IPs
(`185.199.108–111.153`); subdomains are `CNAME`s → `josh-conley.github.io`:

```
Type    Host   Value
A        @      185.199.108.153  (+ .109/.110/.111.153)
CNAME    old    josh-conley.github.io
CNAME    www    josh-conley.github.io   (optional — www → apex)
```

> GitHub Pages serves every site from those same shared IPs — DNS does not know which repo.
> The domain → repo mapping is the **custom-domain setting on each repo**, so a given domain
> can be claimed by only **one** repo at a time.
>
> **ffu-app has no CNAME file** — its custom domain is set purely via the Pages *setting*, so the
> old side of the cutover is a settings change only (nothing to edit in that repo).

## How this repo deploys

- `deploy.yml` builds (`npm run build`) and publishes `dist/` via `actions/deploy-pages`.
- `vite.config.ts` uses `base: '/'` — correct because the site is served at a **custom-domain
  root** (`new.ffunion.com`), not a project subpath. Do **not** change it.
- `public/404.html` is the SPA fallback for BrowserRouter deep links (decoded in `index.html`).
- `public/CNAME` (`ffunion.com`) is copied into `dist` — kept consistent with the Pages
  custom-domain setting (see gotchas).

## One-time setup (already done — recorded for reproducibility)

1. **Settings → Pages → Build and deployment → Source = "GitHub Actions"** (not "Deploy from a branch").
2. **Settings → Pages → Custom domain = `new.ffunion.com`** → Save → wait for the green
   "DNS check successful" → tick **Enforce HTTPS** once the cert provisions (a few minutes).
3. Namecheap: add the `CNAME` record above (apex records left alone).

## Gotchas we hit (don't relearn these)

1. **Source must be "GitHub Actions."** Left on the default "Deploy from a branch," the deploy
   job fails and the domain serves a GitHub 404 ("There isn't a GitHub Pages site here").
2. **With the Actions flow, the `CNAME` file alone does NOT set the custom domain** — you must
   set it in **Settings → Pages → Custom domain**. Symptom: the deploy publishes to
   `josh-conley.github.io/ffu-web/` (project path) instead of the domain.
3. A GitHub-served 404 means DNS is fine but no repo is **claiming** the domain (see #1/#2);
   a registrar parking page would mean DNS isn't reaching GitHub.

## Cutover runbook (apex swap)

No apex DNS change is needed (shared IPs) — it's a CNAME-claim swap via each repo's Pages setting.
`ffunion.com` can only be claimed by one repo, so **ffu-app must release it before ffu-web claims
it** — there is an unavoidable brief window where the apex is unclaimed (GitHub 404). Do the two
Settings changes back-to-back to minimize it. HTTPS certs re-provision (a few minutes) after each claim.

Repo-file half (done in this commit): `public/CNAME` → `ffunion.com`. ffu-app needs no file change.

Manual steps (GitHub UI + Namecheap — no CLI/API access from the agent):

1. **Namecheap** — add `CNAME old → josh-conley.github.io` (leave apex `A` records and the `new`
   record alone for now). Optionally add `CNAME www → josh-conley.github.io`.
2. **ffu-app** (old) — Settings → Pages → Custom domain: `ffunion.com` → `old.ffunion.com` → Save.
   *(Releases the apex. old.ffunion.com goes live once step 1 propagates.)*
3. **ffu-web** (this repo) — ensure the `public/CNAME` change is deployed (push to `main`), then
   Settings → Pages → Custom domain: set `ffunion.com` → Save → wait for green "DNS check
   successful" → tick **Enforce HTTPS** when the cert provisions. *(Claims the apex.)*
4. **Both** — confirm HTTPS is enforced on `ffunion.com` (ffu-web) and `old.ffunion.com` (ffu-app).
5. **`new.ffunion.com`** — drop the `new` CNAME, or keep it (it'll 404 from GitHub since no repo
   claims it), or repurpose as a redirect.
6. If GitHub blocks a repo as "domain already in use," add account-level verification: Settings →
   Pages → verified domains → `_github-pages-challenge-josh-conley` TXT at Namecheap.

Rollback: reverse steps 2–3 (ffu-web → `new.ffunion.com`, ffu-app → `ffunion.com`) and revert
`public/CNAME`.
