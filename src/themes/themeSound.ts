import { audioContext, noiseBuffer } from '@/lib/audioContext'
import type { ThemeId } from './registry'
import { VOICES } from './voices'
import { isClip, type Note, type Sound } from './voices/types'

// Opt-in UI sounds for the skins. This is the player: recordings from public/sounds, and a small
// Web Audio synth for the sounds that have no recording. What each skin sounds like is data in
// ./voices. Loaded on demand, only once a visitor turns sound on.

/** The sound source for one note: an oscillator, or looped noise through a band-pass. */
function source(audio: AudioContext, note: Note, start: number): { node: AudioNode; src: AudioScheduledSourceNode } {
  const end = start + note.dur
  if (note.type === 'noise') {
    const src = audio.createBufferSource()
    src.buffer = noiseBuffer(audio)
    src.loop = true
    const band = audio.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.setValueAtTime(note.hz, start)
    if (note.toHz !== undefined) band.frequency.exponentialRampToValueAtTime(note.toHz, end)
    band.Q.setValueAtTime(note.q ?? 1, start)
    src.connect(band)
    return { node: band, src }
  }
  const osc = audio.createOscillator()
  osc.type = note.type
  osc.frequency.setValueAtTime(note.hz, start)
  if (note.toHz !== undefined) osc.frequency.exponentialRampToValueAtTime(note.toHz, end)
  if (note.vibrato) {
    const lfo = audio.createOscillator()
    const depth = audio.createGain()
    lfo.frequency.setValueAtTime(note.vibrato.hz, start)
    depth.gain.setValueAtTime(note.vibrato.depth, start)
    lfo.connect(depth).connect(osc.frequency)
    lfo.start(start)
    lfo.stop(end + 0.02)
  }
  return { node: osc, src: osc }
}

// Everything plays through one compressor: sounds overlap freely (scrolling while a chime rings,
// a rapid run of presses) and the sum must not clip.
let output: { audio: AudioContext; node: AudioNode } | null = null
function mix(audio: AudioContext): AudioNode {
  if (output?.audio !== audio) {
    const squash = audio.createDynamicsCompressor()
    squash.connect(audio.destination)
    output = { audio, node: squash }
  }
  return output.node
}

function play(notes: Note[], audio: AudioContext) {
  const now = audio.currentTime
  for (const note of notes) {
    const start = now + note.at
    const { node, src } = source(audio, note, start)

    // A short attack so a note doesn't open with a click (longer for a swell), then a natural decay.
    const vol = audio.createGain()
    vol.gain.setValueAtTime(0.0001, start)
    vol.gain.exponentialRampToValueAtTime(note.gain, start + (note.attack ?? 0.008))
    vol.gain.exponentialRampToValueAtTime(0.0001, start + note.dur)

    node.connect(vol).connect(mix(audio))
    src.start(start)
    src.stop(start + note.dur + 0.02)
  }
}

// Recordings, decoded once and kept. A skin's clips are fetched when it is first heard (or as
// soon as sound is on with that skin showing: see `preload`), never before.
const buffers = new Map<string, Promise<AudioBuffer | null>>()
const decoded = new Map<string, AudioBuffer>()

function buffer(audio: AudioContext, path: string): Promise<AudioBuffer | null> {
  let pending = buffers.get(path)
  if (!pending) {
    pending = fetch(`/sounds/${path}`)
      .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(String(res.status)))))
      .then((bytes) => audio.decodeAudioData(bytes))
      .then((buf) => {
        decoded.set(path, buf)
        return buf
      })
      // A missing or undecodable clip is silence, not an error on the page.
      .catch(() => null)
    buffers.set(path, pending)
  }
  return pending
}

function playBuffer(audio: AudioContext, buf: AudioBuffer, gain: number) {
  const src = audio.createBufferSource()
  src.buffer = buf
  const vol = audio.createGain()
  vol.gain.value = gain
  src.connect(vol).connect(mix(audio))
  src.start()
}

/** Fetch every recording a skin uses, so its first sounds are not late. */
export function preload(theme: ThemeId) {
  const voice = VOICES[theme]
  const audio = audioContext()
  if (!voice || !audio) return
  for (const sound of [voice.chime, voice.nav, ...voice.click, ...voice.scroll]) {
    if (isClip(sound)) void buffer(audio, sound.clip)
  }
}

/** Sounds that answer a tap. The tap's own handler has already woken the audio context. */
function playNow(sound: Sound | undefined) {
  const audio = audioContext()
  if (!audio || !sound) return
  if (!isClip(sound)) return play(sound, audio)
  // Waits for the file the first time; after that it is instant.
  void buffer(audio, sound.clip).then((buf) => buf && playBuffer(audio, buf, sound.gain))
}

const wrap = (i: number, length: number) => ((i % length) + length) % length

export const playChime = (theme: ThemeId) => playNow(VOICES[theme]?.chime)
export const playNav = (theme: ThemeId) => playNow(VOICES[theme]?.nav)

let clickTurn = 0
export function playClick(theme: ThemeId) {
  const takes = VOICES[theme]?.click
  if (takes) playNow(takes[wrap(clickTurn++, takes.length)])
}

let scrollStep = 0
/**
 * One tick of scrolling; `direction` is 1 going down the page, -1 going up.
 *
 * Unlike a tap, a scroll cannot wake the audio context, and anything scheduled on a sleeping one
 * piles up and plays all at once when it wakes. So scroll ticks play only once it is running, and
 * a recording that has not arrived yet is skipped, not played late.
 */
export function playScroll(theme: ThemeId, direction: 1 | -1) {
  const takes = VOICES[theme]?.scroll
  const audio = audioContext()
  if (!takes || audio?.state !== 'running') return
  scrollStep += direction
  const sound = takes[wrap(scrollStep, takes.length)]!
  if (!isClip(sound)) return play(sound, audio)
  const buf = decoded.get(sound.clip)
  if (buf) playBuffer(audio, buf, sound.gain)
  else void buffer(audio, sound.clip)
}
