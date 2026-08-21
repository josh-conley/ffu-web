// Draw-night audio, synthesised with Web Audio — no asset files to load, host, or forget to ship.
//
// Browsers refuse to start an AudioContext without a user gesture, so the context is created lazily
// on the first cue (which always follows a click or key press). Every call is best-effort: if audio
// is unavailable or blocked, the draw carries on silently rather than throwing mid-broadcast.

type Cue = 'tick' | 'land' | 'finale'

let ctx: AudioContext | null = null
let muted = false

function context(): AudioContext | null {
  if (muted) return null
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

/** One short shaped tone. `type` and the envelope are what make a tick read differently to a thud. */
function tone(at: number, freq: number, durationMs: number, gain: number, type: OscillatorType) {
  const audio = context()
  if (!audio) return
  const osc = audio.createOscillator()
  const vol = audio.createGain()
  const start = audio.currentTime + at
  const end = start + durationMs / 1000

  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  vol.gain.setValueAtTime(0.0001, start)
  vol.gain.exponentialRampToValueAtTime(gain, start + 0.005)
  vol.gain.exponentialRampToValueAtTime(0.0001, end)

  osc.connect(vol).connect(audio.destination)
  osc.start(start)
  osc.stop(end + 0.02)
}

/**
 * Play a cue.
 *  tick   — one click of the reel; pitched slightly up so a decelerating run sounds like it's slowing
 *  land   — the thud as a crest settles
 *  finale — a short rising sting for the last tie of the night
 */
export function playCue(cue: Cue): void {
  if (cue === 'tick') return tone(0, 880, 30, 0.06, 'square')
  if (cue === 'land') {
    tone(0, 180, 260, 0.28, 'sine')
    tone(0.01, 90, 320, 0.22, 'triangle')
    return
  }
  // finale: a rising three-note figure.
  ;[523.25, 659.25, 783.99].forEach((f, i) => tone(i * 0.13, f, 420, 0.2, 'triangle'))
}

export function setMuted(next: boolean): void {
  muted = next
}

export function isMuted(): boolean {
  return muted
}
