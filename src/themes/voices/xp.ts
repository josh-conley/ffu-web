import { clip, takes, type Note, type Voice } from './types'

// A desktop from 2001. Booting is synthesised: a soft major pad swells in under a glassy
// four-note figure. Everything else is recorded interface sounds: a window opening, clicks and
// confirmations by turns, and a tick for every notch of the wheel.

export const xp: Voice = {
  chime: [
    ...[311.13, 466.16, 622.25].map((hz): Note => ({ type: 'sine', hz, at: 0, dur: 1.9, gain: 0.07, attack: 0.3 })),
    { type: 'triangle', hz: 932.33, at: 0.1, dur: 0.5, gain: 0.1 },
    { type: 'triangle', hz: 783.99, at: 0.45, dur: 0.5, gain: 0.1 },
    { type: 'triangle', hz: 622.25, at: 0.8, dur: 0.5, gain: 0.1 },
    { type: 'triangle', hz: 1244.5, at: 1.15, dur: 1, gain: 0.1 },
  ],
  nav: clip('xp/nav'),
  click: takes('xp/click', 4),
  scroll: takes('xp/scroll', 3, 0.8),
}
