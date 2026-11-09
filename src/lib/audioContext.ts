// The page's one AudioContext, shared by everything that synthesises sound (the Cup draw's wheel
// tick, the theme skins' UI sounds). Browsers cap how many a page may open, and each one holds an
// audio thread.
//
// Best-effort by design: browsers refuse a context without a user gesture, and if audio is blocked
// or unavailable callers get null and simply stay silent.

let ctx: AudioContext | null = null

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
