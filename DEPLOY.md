# Deployment

Hosting: **GitHub Pages** (free, public repo) via the GitHub **Actions** flow
(`.github/workflows/deploy.yml`) — auto-deploys on every push to `main`.

## Current state (interim / staging)

| URL | Repo | Notes |
|---|---|---|
| `ffunion.com` (apex) | `ffu-app` (old) | Live production site — **untouched** until cutover. |
| `new.ffunion.com` | `ffu-web` (this repo) | New site, staging/preview. |

DNS is at **Namecheap**. The apex `A` records point at GitHub's shared Pages IPs
(`185.199.108–111.153`); the subdomain is a `CNAME`:

```
Type    Host   Value
CNAME    new    josh-conley.github.io
```

> GitHub Pages serves every site from those same shared IPs — DNS does not know which repo.
> The domain → repo mapping is the **custom-domain setting on each repo**, so a given domain
> can be claimed by only **one** repo at a time.

## How this repo deploys

- `deploy.yml` builds (`npm run build`) and publishes `dist/` via `actions/deploy-pages`.
- `vite.config.ts` uses `base: '/'` — correct because the site is served at a **custom-domain
  root** (`new.ffunion.com`), not a project subpath. Do **not** change it.
- `public/404.html` is the SPA fallback for BrowserRouter deep links (decoded in `index.html`).
- `public/CNAME` (`new.ffunion.com`) is copied into `dist` — kept consistent with the Pages
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

## Cutover checklist (apex swap — when the new site is ready)

No apex DNS change needed (shared IPs); it's a settings + CNAME-claim swap:

1. **ffu-web** (this repo): Settings → Pages → Custom domain → `ffunion.com`; update
   `public/CNAME` → `ffunion.com`. Add a `www` CNAME (`www` → `josh-conley.github.io`) +
   set `www.ffunion.com` handling if desired.
2. **ffu-app** (old): Settings → Pages → Custom domain → `old.ffunion.com`. Add Namecheap
   `CNAME old → josh-conley.github.io`.
3. Drop (or repurpose as a redirect) the `new` CNAME.
4. Re-verify HTTPS on both; confirm GitHub account-level domain verification covers `ffunion.com`
   (Settings → Pages → Add a domain → `_github-pages-challenge-josh-conley` TXT) if any repo is
   blocked as "already in use."
