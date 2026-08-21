// ⚠️ PARKED, NOT DEAD (2026-08-21). Nothing calls this today: the voiceover was switched off in the
// live draw because no voice we could produce came close to the brief. The pipeline is kept
// deliberately — generator, clip playback, phrase tokens and tests all still work — so that landing
// a real announcer voice is a file drop rather than a rebuild.
//
// To switch it back on: in DrawStage, load a voice (clipVoice, falling back to browserVoice) and
// speak `tiePhrases(drawer, drawn, firstMeeting)` when `reveal.phase === 'shown'`. See
// ai-docs/DECISIONS.md (2026-08-21) and the announcer entry in ai-docs/TODO.md.

import type { AnnouncePhrase, Voice } from './announcer'
import { clipKey } from './announceClips.mjs'

// Plays the announcer from PRE-GENERATED clips (public/audio/draw), one per phrase token. This is
// the voice that can actually sound like a broadcast — swap the files for a better recording and
// nothing here changes, because the filenames come from the shared clipKey.
//
// Clips are decoded once up front and then scheduled on the AUDIO clock, back to back. Sequencing
// <audio> elements would leave an audible seam between every word.

const BASE = '/audio/draw'
/** A breath between phrases. Long enough to land, short enough to keep the energy up. */
const GAP_S = 0.12

interface Manifest {
  voice: string
  keys: string[]
}

let ctx: AudioContext | null = null
const buffers = new Map<string, AudioBuffer>()
let manifest: Manifest | null = null
let playing: AudioBufferSourceNode[] = []

function context(): AudioContext | null {
  if (ctx) return ctx
  const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  try {
    ctx = new Ctor()
  } catch {
    return null
  }
  return ctx
}

/**
 * Fetches the manifest and decodes every clip. Call once, when the operator enters a seed — a
 * megabyte decoded up front so no tie ever waits on the network mid-broadcast.
 *
 * Returns false when there is no clip set, which is the caller's signal to fall back to the
 * browser's own speech.
 */
export async function loadClips(): Promise<boolean> {
  const audio = context()
  if (!audio) return false
  try {
    const res = await fetch(`${BASE}/manifest.json`)
    if (!res.ok) return false
    manifest = (await res.json()) as Manifest
    const loaded = await Promise.all(
      manifest.keys.map(async (key) => {
        const clip = await fetch(`${BASE}/${key}.m4a`)
        if (!clip.ok) return null
        return [key, await audio.decodeAudioData(await clip.arrayBuffer())] as const
      }),
    )
    for (const entry of loaded) if (entry) buffers.set(entry[0], entry[1])
    return buffers.size > 0
  } catch {
    return false
  }
}

export const clipVoice: Voice = {
  available: () => buffers.size > 0,

  speak(phrases: AnnouncePhrase[]) {
    const audio = context()
    if (!audio) return
    clipVoice.cancel()
    if (audio.state === 'suspended') void audio.resume()

    let at = audio.currentTime + 0.05
    for (const phrase of phrases) {
      const buffer = buffers.get(clipKey(phrase))
      if (!buffer) continue // a name with no clip is skipped rather than silencing the whole call
      const src = audio.createBufferSource()
      src.buffer = buffer
      src.connect(audio.destination)
      src.start(at)
      playing.push(src)
      at += buffer.duration + GAP_S
    }
  },

  cancel() {
    for (const src of playing) {
      try {
        src.stop()
      } catch {
        // Already finished.
      }
    }
    playing = []
  },
}
