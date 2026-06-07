# Autonomous Discord → PR pipeline

The league commissioner posts a request in a Discord channel; a scheduled GitHub Action implements
it with Claude Code, runs the gates, **opens a PR** (never auto-merges), and replies in Discord with
the PR link (✅) or the reason it couldn't (❌). Runs entirely in GitHub's cloud — your computer can
be off.

```
commissioner posts in #channel
        │
        ▼  (every 15 min, or manual)
GitHub Action: claim 👀 → Claude implements + commits → gates → push branch → open PR
        │
        ▼
reply in Discord:  ✅ + PR link   |   ❌ + reason
```

## One-time setup

### 1. Create the bot
1. https://discord.com/developers/applications → **New Application**.
2. **Bot** tab → copy the **token** (this is `DISCORD_BOT_TOKEN`).
3. **Bot** tab → enable the **Message Content Intent** (privileged — required to read request text).
4. **OAuth2 → URL Generator**: scope `bot`; permissions **View Channels**, **Read Message History**,
   **Send Messages**, **Add Reactions**. Open the generated URL to invite the bot to your server.

### 2. Get the IDs
Enable Developer Mode in Discord (User Settings → Advanced), then right-click:
- the request **channel** → Copy Channel ID → `DISCORD_CHANNEL_ID`
- the **commissioner's** name → Copy User ID → `DISCORD_COMMISSIONER_ID`
  (only these users' messages in that channel are treated as requests). Accepts a **comma-separated
  list** to allow more than one person, e.g. `commishId,yourId`.

### 3. Add to the repo (Settings → Secrets and variables → Actions)
**Secrets:**
- `DISCORD_BOT_TOKEN`
- `CLAUDE_CODE_OAUTH_TOKEN` — generate with `claude setup-token` (uses your Claude Pro/Max
  subscription instead of pay-per-use API billing; counts against your plan's usage limits)

**Variables:**
- `DISCORD_CHANNEL_ID`
- `DISCORD_COMMISSIONER_ID`

### 4. Test
Actions tab → **Discord site requests** → **Run workflow**. With no pending request it just logs
"No new requests." Post a small request in the channel as the commissioner, run it again, and watch
for the 👀 → ✅ + PR link.

## Safety model
- **PR-first** — changes never merge themselves; you review every PR before it deploys.
- **Scoped trigger** — only the commissioner's messages in the one channel count.
- **Hard gate** — a red typecheck/lint/test never produces a PR.
- **Credential isolation** — the Claude step only receives `ANTHROPIC_API_KEY`; the Discord and
  GitHub tokens are confined to the read/report/PR steps, so a prompt-injected request can't leak them.
- **Staging buffer** — `main` currently deploys to `new.ffunion.com` (staging), not the live apex.
  Re-evaluate the autonomy/PR bar before cutover to production.

## How a request is tracked
Each message gets at most one bot reaction: 👀 (claimed) then ✅ (done) or ❌ (failed). The poller
skips anything the bot has already reacted to, so requests aren't double-processed. A failed request
keeps its ❌ (it won't be retried automatically — repost to try again).

## Files
- `discord.mjs` — raw Discord REST helper (`next` / `done` / `fail`), no dependencies.
- `../../.github/workflows/discord-requests.yml` — the pipeline.
