# Preview Environment Plan

**Goal:** When `auto/requests` is updated with a Discord request, the requestor gets a live
preview URL alongside the PR link so they can see the change before it merges to `main`.

---

## Why the current setup can't do this

GitHub Pages supports **one deployment per repo**. The `deploy.yml` workflow owns that slot
(`new.ffunion.com` → `main`). There is no way to simultaneously serve `auto/requests` as a
second GitHub Pages site from the same repo.

---

## Recommended approach: Cloudflare Pages for branch previews

**Cloudflare Pages** is the right fit:

- Native branch preview deployments — every branch push gets a stable, auto-generated URL.
- Same build command (`npm run build`, output `dist`), same `vite.config.ts` — no build changes
  needed. The `public/CNAME` file (a GitHub Pages artifact) is harmless on Cloudflare; ignore it.
- Free tier is generous: 500 builds/month, unlimited requests. Discord requests are rare.
- Branch URL is predictable and permanent for the branch lifetime:
  `auto-requests.<project-name>.pages.dev` (Cloudflare sanitizes `/` → `-`).
- We can alias `preview.ffunion.com` to that branch — a stable CNAME the Discord bot can always
  report, regardless of whether Cloudflare's internal URL is known.

### Architecture after this change

| URL | Source | Branch | Trigger |
|---|---|---|---|
| `ffunion.com` / `new.ffunion.com` | GitHub Pages | `main` | `deploy.yml` on push |
| `preview.ffunion.com` | Cloudflare Pages | `auto/requests` | Cloudflare GitHub integration auto-detects push |

Both deployments coexist. No changes to the existing `deploy.yml` or GitHub Pages config.

---

## What needs to happen

### Step 1 — One-time Cloudflare setup (manual, on laptop)

1. **Create a Cloudflare account** if you don't already have one (free).
2. **Create a Pages project** connected to the `ffu-web` GitHub repo:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: (leave blank / repo root)
   - Node.js version: 22 (set in environment variables: `NODE_VERSION = 22`)
3. **Branch deploy settings** — you only need `auto/requests` deployed here; `main` stays on
   GitHub Pages. In the Cloudflare Pages project settings:
   - Production branch: set to something that won't conflict (e.g., `cf-production-unused`) so
     Cloudflare doesn't shadow the GitHub Pages production site.
   - Preview branches: enable and include `auto/requests` (or all branches — fine either way).
4. **Custom domain for the preview branch**:
   - In the project → Custom domains → add `preview.ffunion.com`.
   - Cloudflare will provision the CNAME automatically if you're using Cloudflare DNS, OR
   - Add a Namecheap `CNAME` record: `preview` → `<project-name>.pages.dev`.
   - Then in Pages → `auto/requests` branch settings, assign `preview.ffunion.com` to that branch.

   > Note: Cloudflare Pages custom domains on preview branches require the "Preview branches → Custom
   > domains" setting; this is available on the free plan as of 2025.

5. **Confirm** the first deployment completes and `preview.ffunion.com` resolves correctly.

### Step 2 — Update `discord.mjs` (code change)

The `done()` function currently reports only the PR URL. Add the preview URL:

```js
// automation/discord-requests/discord.mjs

async function done(msgId, prUrl, previewUrl) {
  await react(msgId, EMOJI.done)
  const previewLine = previewUrl ? `\n🔍 Preview: ${previewUrl}` : ''
  await reply(msgId, `✅ Done — added to the review PR:\n${prUrl}${previewLine}`)
}
```

And in the `commands` dispatcher:

```js
done: () => done(args[0], args[1], args[2]),
```

### Step 3 — Update `discord-requests.yml` (workflow change)

Pass the preview URL to the `done` step. Since `preview.ffunion.com` is stable once set up,
hardcode it (no API call needed):

```yaml
# Add to env: block at workflow level (or job level):
PREVIEW_URL: 'https://preview.ffunion.com'
```

```yaml
# In the "Report success" step:
run: node automation/discord-requests/discord.mjs done "${{ steps.req.outputs.message_id }}" "${{ steps.pr.outputs.pr_url }}" "$PREVIEW_URL"
```

> **Timing note:** Cloudflare Pages deploys are triggered by the `git push origin auto/requests`
> step (Step 5 in the workflow). The Cloudflare build typically takes 30–90 seconds after that push.
> The Discord reply goes out immediately after the push succeeds, so the preview URL may not resolve
> for ~1–2 minutes. That's fine — the bot can note this with parenthetical text:
> `🔍 Preview (ready in ~1 min): https://preview.ffunion.com`

### Step 4 — Update `DEPLOY.md`

Add a section documenting the preview environment: what it serves, how it's triggered, and the
Cloudflare Pages project name. This prevents the next-person-to-look confusion.

---

## Trade-offs considered

| Option | Why rejected |
|---|---|
| Second GitHub Pages repo (`ffu-web-preview`) | Requires a second repo + cross-repo PAT for push; adds management overhead. |
| Netlify | 300 build-minutes/month free — workable, but Cloudflare is more generous and already the DNS provider for `ffunion.com`. |
| Vercel | Free tier restricts commercial use; this is a personal league site but the policy is ambiguous. |
| `cloudflare/pages-action` GitHub Action (explicit trigger) | Adds Cloudflare API token as a secret; more moving parts. Auto-detection via GitHub integration is simpler. |
| Deploy from workflow to a known path (e.g., GitHub Releases / S3) | Requires external credentials + custom hosting; far more work for the same result. |

---

## Sequencing for Opus

Implement in this order — each step is independently testable:

1. **Step 1** (manual by user): Cloudflare Pages setup + DNS. Confirm `preview.ffunion.com` shows
   the current `auto/requests` branch content (or a blank Cloudflare page if branch is clean).
2. **Step 2**: Update `discord.mjs` — trivial; unit-testable by reading the file.
3. **Step 3**: Update `discord-requests.yml` — one env var + one argument change.
4. **Step 4**: Update `DEPLOY.md`.
5. **End-to-end test**: Post a test Discord request; confirm the success reply includes the preview
   URL and it resolves within a couple minutes.

Steps 2–4 are all small code changes and can be done in a single commit. Step 1 is the only
manual prerequisite.

---

## Open question

Should the Cloudflare Pages project also serve `auto/*` wildcard branches (i.e., future
automation branches), or only `auto/requests`? The latter is cleaner for now; the former is
zero-config on Cloudflare (deploy all non-main branches = all branches starting with `auto/`
are automatically previewed). Recommend wildcard for flexibility — costs nothing.
