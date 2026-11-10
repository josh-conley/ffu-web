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

import { audioContext, noiseBuffer } from './audioContext'

const TICK = { hz: 2200, gain: 0.22, decay: 0.03 }
const CLUNK = { hz: 900, gain: 0.45, decay: 0.07 }

/**
 * Schedules one tick per entry in `offsetsMs`, relative to now. Returns a cancel function for when
 * the operator cuts a spin short — otherwise the wheel would keep ticking after it had stopped.
 */
export function scheduleTicks(offsetsMs: number[]): () => void {
  const audio = audioContext()
  if (!audio) return () => {}

  const buffer = noiseBuffer(audio)
  const now = audio.currentTime
  const sources: AudioBufferSourceNode[] = []

  offsetsMs.forEach((offset, i) => {
    // The last tick is the flapper settling against its peg: lower, louder and longer, so the ear
    // hears the wheel STOP rather than just run out of ticks.
    const tone = i === offsetsMs.length - 1 ? CLUNK : TICK
    const at = now + offset / 1000
    const src = audio.createBufferSource()
    src.buffer = buffer

    // Narrow bandpass = the woody "tock" of a peg rather than a hiss.
    const band = audio.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.setValueAtTime(tone.hz, at)
    band.Q.setValueAtTime(7, at)

    const vol = audio.createGain()
    vol.gain.setValueAtTime(tone.gain, at)
    vol.gain.exponentialRampToValueAtTime(0.0001, at + tone.decay)

    src.connect(band).connect(vol).connect(audio.destination)
    src.start(at)
    src.stop(at + tone.decay * 2)
    sources.push(src)
  })

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
