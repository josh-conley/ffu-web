import { audioContext, noiseBuffer } from '@/lib/audioContext'
import type { ThemeId } from './registry'
import { VOICES } from './voices'
import type { Note } from './voices/types'

// Opt-in UI sounds for the skins, synthesised with Web Audio: no asset files to host. This is the
// player; what each skin sounds like is data in ./voices. Loaded on demand, only once a visitor
// turns sound on.

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

/** Sounds that answer a tap. The tap's own handler has already woken the audio context. */
function playNow(notes: Note[] | undefined) {
  const audio = audioContext()
  if (audio && notes) play(notes, audio)
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
 * piles up and plays all at once when it wakes. So scroll ticks play only once it is running.
 */
export function playScroll(theme: ThemeId, direction: 1 | -1) {
  const takes = VOICES[theme]?.scroll
  const audio = audioContext()
  if (!takes || audio?.state !== 'running') return
  scrollStep += direction
  play(takes[wrap(scrollStep, takes.length)]!, audio)
}
