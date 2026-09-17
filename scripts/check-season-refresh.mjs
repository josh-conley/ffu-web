// Gatekeeper between `npm run refresh-season` and a commit. Runs in the weekly GitHub Action
// (.github/workflows/refresh-season.yml) against the working tree the refresh just wrote, and
// decides whether that change is safe to publish unattended.
//
// It FAILS (exit 1, nothing gets committed) when:
//   - a file outside public/data/<live year>/ or public/data/seasons.json changed, or
//   - a game that was already written changed its score or disappeared. Only completed weeks are
//     ever written, so a moved score means something upstream is wrong — a human should look.
// It WARNS (job summary, still commits) when the schedule changed: the commissioner may have
// edited it, which is legitimate but worth knowing.
//
// Outputs for the workflow (via $GITHUB_OUTPUT when set): `changed`, `year`, `week`, `message`.
//
// Run locally after a refresh:  node scripts/check-season-refresh.mjs

import { appendFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { ROOT, TIERS, isLiveYear, readJson } from './lib/ffuConfig.mjs'
import { diffSeason, lastWeekOf } from './lib/seasonDiff.mjs'

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' })

/** The committed version of a file, or undefined when it's new. */
function committed(path) {
  try {
    return JSON.parse(git('show', `HEAD:${path}`))
  } catch {
    return undefined
  }
}

const changedPaths = () =>
  git('status', '--porcelain', '--untracked-files=all')
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3))

function output(name, value) {
  if (!process.env.GITHUB_OUTPUT) return
  appendFileSync(process.env.GITHUB_OUTPUT, `${name}<<EOF_${name}\n${value}\nEOF_${name}\n`)
}

function summary(markdown) {
  console.log(markdown)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`)
}

function fail(message) {
  summary(`### ✗ Refresh not committed\n\n${message}`)
  process.exit(1)
}

const describeGame = (g) => `week ${g.week}: ${g.participants.map((p) => `${p.memberId} ${p.score}`).join(' v ')}`

/** Diff each tier's file against HEAD; fail on anything a refresh must never do. */
function checkTiers(year) {
  const rows = []
  const warnings = []
  for (const tier of TIERS) {
    const path = `public/data/${year}/${tier.toLowerCase()}.json`
    if (!existsSync(join(ROOT, path))) fail(`\`${path}\` is missing after the refresh.`)
    const after = readJson(join(ROOT, path))
    const before = committed(path) ?? { games: [], schedule: [] }
    const { added, changed, removed, scheduleChanged } = diffSeason(before, after)
    if (changed.length > 0 || removed.length > 0) {
      const lines = [
        ...changed.map((c) => `- changed — ${describeGame(c.before)} → ${describeGame(c.after)}`),
        ...removed.map((g) => `- removed — ${describeGame(g)}`),
      ]
      fail(`${tier}: completed games changed. Completed scores are final, so this needs a human.\n\n${lines.join('\n')}`)
    }
    if (scheduleChanged) warnings.push(`⚠️ ${tier}: the schedule changed — the commissioner may have edited it.`)
    rows.push({ tier, games: after.games.length, added: added.length, week: lastWeekOf(after) })
  }
  return { rows, warnings }
}

function main() {
  const year = process.argv[2] ?? String(new Date().getFullYear())
  const paths = changedPaths()
  if (paths.length === 0) {
    summary(`### No change\n\nNothing new for ${year} — no completed week since the last refresh.`)
    output('changed', 'false')
    return
  }
  if (!isLiveYear(year)) fail(`${year} is not the live season (src/config/liveSeason.ts), but files changed.`)
  const allowed = (p) => p === 'public/data/seasons.json' || p.startsWith(`public/data/${year}/`)
  const stray = paths.filter((p) => !allowed(p))
  if (stray.length > 0) fail(`Files outside \`public/data/${year}/\` changed:\n\n${stray.map((p) => `- \`${p}\``).join('\n')}`)

  const { rows, warnings } = checkTiers(year)
  const week = Math.max(0, ...rows.map((r) => r.week))
  const subject = week === 0 ? `chore(data): refresh ${year} league metadata` : `chore(data): refresh ${year} through week ${week}`
  const body = `${rows.map((r) => `${r.tier} ${r.games}`).join(', ')} games. Written by the weekly refresh workflow.`

  summary(
    [
      `### ${subject}`,
      '',
      '| League | Games | New |',
      '| --- | ---: | ---: |',
      ...rows.map((r) => `| ${r.tier} | ${r.games} | ${r.added} |`),
      '',
      ...warnings,
    ].join('\n'),
  )
  output('changed', 'true')
  output('year', year)
  output('week', String(week))
  output('message', `${subject}\n\n${body}`)
}

main()
