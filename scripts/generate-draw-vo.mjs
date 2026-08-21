// Generates the draw announcer's clip set into public/audio/draw/.
//
// One clip per team name plus the fixed connectives, named by the SAME clipKey the player uses, so
// the two can't drift. Run it, listen, fix a name in SPOKEN_NAMES, run it again.
//
//   npm run draw-vo                 (macOS `say` — a placeholder voice)
//   npm run draw-vo -- --list       (print what would be generated, and the text of each line)
//
// ── Replacing the voice ────────────────────────────────────────────────────────────────────────
// macOS voices are satnav-class; none of them is a hype announcer. To get the real thing, generate
// the same filenames with a neural TTS (or record a human) and drop them into public/audio/draw/.
// `--list` prints the exact text for every clip, which is the script to hand to whatever produces
// them. Nothing in the app changes: it plays whatever files are there.

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ANNOUNCE_WORDS, clipKey, spokenName } from '../src/lib/announceClips.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'audio', 'draw')

// macOS speech commands: lower pitch, deliberate pace, full volume — as close to an arena voice as
// the built-in synthesiser gets. These are the knobs to tweak if a placeholder clip reads wrong.
const VOICE = 'Daniel'
const PROSODY = '[[pbas 30]][[rate 150]][[volm 1.0]]'

function members() {
  const src = readFileSync(join(ROOT, 'src', 'config', 'members.ts'), 'utf8')
  const match = src.match(/export const MEMBERS\b[^=]*=\s*(\[[\s\S]*?\n\])/)
  if (!match) throw new Error('Could not find MEMBERS in src/config/members.ts')
  return new Function(`return ${match[1]}`)()
}

/** Every clip to produce: its filename stem and the words to say. */
function clipList() {
  const clips = ANNOUNCE_WORDS.map((text) => ({ key: clipKey({ kind: 'word', text }), text }))
  for (const m of members()) {
    // Sleeper-era members only: nobody else can appear in a Cup draw.
    if (!(m.platformIds?.sleeper ?? []).length) continue
    clips.push({ key: clipKey({ kind: 'team', ffuId: m.ffuId }), text: spokenName(m.ffuId, m.name) })
  }
  return clips
}

const clips = clipList()

if (process.argv.includes('--list')) {
  console.log(`${clips.length} clips\n`)
  for (const c of clips) console.log(`  ${c.key.padEnd(20)} "${c.text}"`)
  process.exit(0)
}

mkdirSync(OUT, { recursive: true })
const scratch = join(OUT, '.tmp.aiff')

for (const [i, clip] of clips.entries()) {
  const target = join(OUT, `${clip.key}.m4a`)
  execFileSync('say', ['-v', VOICE, '-o', scratch, `${PROSODY}${clip.text}`])
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '64000', scratch, target])
  process.stdout.write(`\r  ${i + 1}/${clips.length} ${clip.key.padEnd(24)}`)
}
rmSync(scratch, { force: true })

// A manifest so the app knows a clip set exists (and which keys it covers) without probing for 404s.
writeFileSync(
  join(OUT, 'manifest.json'),
  `${JSON.stringify({ voice: VOICE, generated: new Date().toISOString().slice(0, 10), keys: clips.map((c) => c.key) }, null, 2)}\n`,
)
console.log(`\n✓ ${clips.length} clips → public/audio/draw/`)
console.log('  These are PLACEHOLDERS. Replace them with the same filenames from a real announcer voice.')
