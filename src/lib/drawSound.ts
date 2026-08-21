// The reel's wheel tick, synthesised with Web Audio — no asset files to load, host or forget to ship.
//
// A prize-wheel tick is a flapper striking a peg: a broadband CLICK with a little body, not a pitched
// beep. So it's a very short noise burst through a narrow bandpass, rather than an oscillator.
//
// Ticks are scheduled on the AUDIO clock, not with setTimeout. At full speed they come ~14ms apart,
// which is inside setTimeout's jitter — the wheel would sound ragged. Handing the whole schedule to
// Web Audio up front makes it sample-accurate.
//
// Everything is best-effort: browsers refuse an AudioContext without a user gesture (the draw always
// follows a click or key press, so that is satisfied), and if audio is blocked or unavailable the
// draw simply runs silent rather than throwing mid-broadcast.

let ctx: AudioContext | null = null
let noise: AudioBuffer | null = null

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

/** ~80ms of white noise, made once and reused for every tick. */
function noiseBuffer(audio: AudioContext): AudioBuffer {
  if (noise) return noise
  const frames = Math.floor(audio.sampleRate * 0.08)
  const buffer = audio.createBuffer(1, frames, audio.sampleRate)
  const channel = buffer.getChannelData(0)
  for (let i = 0; i < frames; i++) channel[i] = Math.random() * 2 - 1
  noise = buffer
  return buffer
}

/**
 * Schedules one tick per entry in `offsetsMs`, relative to now. Returns a cancel function for when
 * the operator cuts a spin short — otherwise the wheel would keep ticking after it had stopped.
 */
export function scheduleTicks(offsetsMs: number[]): () => void {
  const audio = context()
  if (!audio) return () => {}
  if (audio.state === 'suspended') void audio.resume()

  const buffer = noiseBuffer(audio)
  const now = audio.currentTime
  const sources: AudioBufferSourceNode[] = []

  for (const offset of offsetsMs) {
    const at = now + offset / 1000
    const src = audio.createBufferSource()
    src.buffer = buffer

    // Narrow bandpass = the woody "tock" of a peg rather than a hiss.
    const band = audio.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.setValueAtTime(2200, at)
    band.Q.setValueAtTime(7, at)

    const vol = audio.createGain()
    vol.gain.setValueAtTime(0.22, at)
    vol.gain.exponentialRampToValueAtTime(0.0001, at + 0.03)

    src.connect(band).connect(vol).connect(audio.destination)
    src.start(at)
    src.stop(at + 0.06)
    sources.push(src)
  }

  return () => {
    for (const src of sources) {
      try {
        src.stop()
      } catch {
        // Already finished; nothing to stop.
      }
    }
  }
}
