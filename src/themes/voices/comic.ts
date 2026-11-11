import { type Note, type Voice } from './types'

// The sound effects lettered across a comic page. A punch and a brass ta-da to open; then POW,
// BOING, ZAP and WHAM by turns on every press, a hero's whoosh and landing when you change page,
// and pages zipping past as you scroll.

const zip = (from: number, to: number): Note[] => [{ type: 'noise', hz: from, toHz: to, q: 2, at: 0, dur: 0.07, gain: 0.3 }]

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
    // POW!
    [
      { type: 'sine', hz: 240, toHz: 50, at: 0, dur: 0.18, gain: 0.32 },
      { type: 'noise', hz: 1200, q: 0.5, at: 0, dur: 0.1, gain: 0.3 },
    ],
    // BOING!
    [{ type: 'triangle', hz: 180, toHz: 520, at: 0, dur: 0.38, gain: 0.26, vibrato: { hz: 22, depth: 60 } }],
    // ZAP!
    [
      { type: 'sawtooth', hz: 2400, toHz: 260, at: 0, dur: 0.18, gain: 0.12 },
      { type: 'noise', hz: 4000, toHz: 800, q: 2, at: 0, dur: 0.16, gain: 0.18 },
    ],
    // WHAM! A cymbal crash on a thud.
    [
      { type: 'noise', hz: 6000, q: 0.6, at: 0, dur: 0.32, gain: 0.26 },
      { type: 'sine', hz: 160, toHz: 60, at: 0, dur: 0.14, gain: 0.3 },
    ],
  ],
  scroll: [zip(900, 3200), zip(1200, 4200), zip(1000, 3600)],
}
