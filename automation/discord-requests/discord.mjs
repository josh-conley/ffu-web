#!/usr/bin/env node
// Discord helper for the autonomous "site requests" pipeline (raw REST v10, no deps).
//
//   node discord.mjs next                  → claim the oldest unhandled commissioner request
//                                            (reacts 👀), writes request.txt, sets step outputs
//   node discord.mjs done <msgId> <prUrl>  → reply with the PR link + react ✅
//   node discord.mjs fail <msgId> <reason> → reply with the reason + react ❌
//
// Env: DISCORD_BOT_TOKEN (required), DISCORD_CHANNEL_ID (required),
//      DISCORD_COMMISSIONER_ID (recommended) — a comma-separated list of user IDs allowed to make
//      requests (e.g. "commishId,yourId"); only these authors' messages are treated as requests.
import { writeFileSync, appendFileSync } from 'node:fs'

const API = 'https://discord.com/api/v10'
const need = (name) => {
  const v = process.env[name]
  if (!v) {
    console.error(`Missing required env ${name}`)
    process.exit(1)
  }
  return v
}
const TOKEN = need('DISCORD_BOT_TOKEN')
const CHANNEL = need('DISCORD_CHANNEL_ID')
// Comma-separated allow-list of requester user IDs (empty = anyone in the channel).
const ALLOWED = new Set(
  (process.env.DISCORD_COMMISSIONER_ID ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
)

const EMOJI = { claim: '👀', done: '✅', fail: '❌' }

async function api(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bot ${TOKEN}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  if (!res.ok) throw new Error(`Discord ${init.method ?? 'GET'} ${path} → ${res.status}: ${await res.text()}`)
  return res.status === 204 ? null : res.json()
}

const react = (msg, emoji) =>
  api(`/channels/${CHANNEL}/messages/${msg}/reactions/${encodeURIComponent(emoji)}/@me`, { method: 'PUT' })

const reply = (msg, content) =>
  api(`/channels/${CHANNEL}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, message_reference: { message_id: msg }, allowed_mentions: { parse: [] } }),
  })

const setOutput = (kv) => {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${kv}\n`)
}

async function next() {
  const messages = await api(`/channels/${CHANNEL}/messages?limit=50`)
  // Newest-first from the API. A request is unhandled if WE haven't reacted to it yet (claim/done/
  // fail all leave a `me: true` reaction, so any of them means "already seen").
  const pick = messages
    .filter((m) => !m.author.bot)
    .filter((m) => ALLOWED.size === 0 || ALLOWED.has(m.author.id))
    .filter((m) => (m.content ?? '').trim().length > 0)
    .filter((m) => !(m.reactions ?? []).some((r) => r.me))
    .reverse() // oldest-first, so requests are handled in the order they were posted
    .at(0)

  if (!pick) {
    setOutput('has_request=false')
    console.log('No new requests.')
    return
  }
  await react(pick.id, EMOJI.claim) // claim immediately so a later run won't double-process it
  writeFileSync('request.txt', pick.content)
  setOutput('has_request=true')
  setOutput(`message_id=${pick.id}`)
  console.log(`Claimed request ${pick.id} from @${pick.author.username}`)
}

async function done(msgId, prUrl) {
  await react(msgId, EMOJI.done)
  await reply(msgId, `✅ Done — opened a PR for review:\n${prUrl}`)
}

async function fail(msgId, reason) {
  await react(msgId, EMOJI.fail)
  await reply(msgId, `❌ Couldn't complete this automatically.\n> ${(reason || 'see the Actions log').slice(0, 1500)}`)
}

const [cmd, ...args] = process.argv.slice(2)
const commands = {
  next,
  done: () => done(args[0], args[1]),
  fail: () => fail(args[0], args.slice(1).join(' ')),
}
const run = commands[cmd]
if (!run) {
  console.error('Usage: discord.mjs next | done <msgId> <prUrl> | fail <msgId> <reason>')
  process.exit(1)
}
run().catch((err) => {
  console.error(err)
  process.exit(1)
})
