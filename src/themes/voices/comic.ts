import { takes, type Note, type Voice } from './types'

// The sound effects lettered across a comic page. A punch and a brass ta-da to open; then POW,
// BOING, ZAP and WHAM by turns on every press, a hero's whoosh and landing when you change page,
// and pages zipping past as you scroll.

export const comic: Voice = {
  chime: [
    { type: 'sine', hz: 220, toHz: 50, at: 0, dur: 0.16, gain: 0.3 },
    { type: 'noise', hz: 1100, q: 0.5, at: 0, dur: 0.09, gain: 0.25 },
    ...[392, 493.88, 587.33].map((hz): Note => ({ type: 'sawtooth', hz, at: 0.2, dur: 0.12, gain: 0.05 })),
    ...[523.25, 659.25, 783.99].map((hz): Note => ({ type: 'sawtooth', hz, at: 0.34, dur: 0.5, gain: 0.05 })),
  ],
  // WHOOSH, then the landing.
  nav: [
    { type: 'noise', hz: 400, toHz: 3600, q: 1.2, at: 0, dur: 0.28, gain: 0.3, attack: 0.1 },
    { type: 'sine', hz: 200, toHz: 55, at: 0.27, dur: 0.16, gain: 0.3 },
    { type: 'noise', hz: 1000, q: 0.5, at: 0.27, dur: 0.08, gain: 0.25 },
  ],
  click: [
    ...takes('comic/click', 5),
  ],
  scroll: takes('comic/scroll', 3),
}
