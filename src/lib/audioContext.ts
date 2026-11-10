// The page's one AudioContext, shared by everything that synthesises sound (the Cup draw's wheel
// tick, the theme skins' UI sounds). Browsers cap how many a page may open, and each one holds an
// audio thread.
//
// Best-effort by design: browsers refuse a context without a user gesture, and if audio is blocked
// or unavailable callers get null and simply stay silent.

let ctx: AudioContext | null = null
let noise: AudioBuffer | null = null

export function audioContext(): AudioContext | null {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    try {
      ctx = new Ctor()
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** ~80ms of white noise, made once and shared: the raw material for clicks, snares and shakers. */
export function noiseBuffer(audio: AudioContext): AudioBuffer {
  if (noise) return noise
  const frames = Math.floor(audio.sampleRate * 0.08)
  const buffer = audio.createBuffer(1, frames, audio.sampleRate)
  const channel = buffer.getChannelData(0)
  for (let i = 0; i < frames; i++) channel[i] = Math.random() * 2 - 1
  noise = buffer
  return buffer
}
