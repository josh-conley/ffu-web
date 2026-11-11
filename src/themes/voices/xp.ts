import { bell, type Note, type Voice } from './types'

// A desktop from 2001. Booting: a soft major pad swells in under a glassy four-note figure.
// Everything else is the operating system talking back: a window opening, the "ding" of a dialog,
// a balloon tip popping up, the dry tick of a folder, a mouse wheel's ratchet.

const TICK: Note[] = [
  { type: 'noise', hz: 3000, q: 2, at: 0, dur: 0.03, gain: 0.3 },
  { type: 'sine', hz: 700, toHz: 450, at: 0, dur: 0.07, gain: 0.22 },
]
const wheel = (hz: number): Note[] => [
  { type: 'noise', hz, q: 4, at: 0, dur: 0.018, gain: 0.3 },
  { type: 'sine', hz: hz / 2, at: 0, dur: 0.02, gain: 0.08 },
]

export const xp: Voice = {
  chime: [
    ...[311.13, 466.16, 622.25].map((hz): Note => ({ type: 'sine', hz, at: 0, dur: 1.9, gain: 0.07, attack: 0.3 })),
    { type: 'triangle', hz: 932.33, at: 0.1, dur: 0.5, gain: 0.1 },
    { type: 'triangle', hz: 783.99, at: 0.45, dur: 0.5, gain: 0.1 },
    { type: 'triangle', hz: 622.25, at: 0.8, dur: 0.5, gain: 0.1 },
    { type: 'triangle', hz: 1244.5, at: 1.15, dur: 1, gain: 0.1 },
  ],
  // A window opening: a quick rising pair over a breath of pad.
  nav: [
    { type: 'sine', hz: 311.13, at: 0, dur: 0.45, gain: 0.08, attack: 0.08 },
    ...bell(622.25, 0, 0.25, 0.16),
    ...bell(932.33, 0.11, 0.4, 0.16),
  ],
  click: [
    // The dialog "ding".
    [...bell(880, 0, 0.3, 0.2), { type: 'triangle', hz: 1318.5, at: 0.02, dur: 0.25, gain: 0.08 }],
    TICK,
    // A balloon tip popping up.
    [
      { type: 'sine', hz: 500, toHz: 820, at: 0, dur: 0.09, gain: 0.22 },
      { type: 'sine', hz: 1240, at: 0.08, dur: 0.14, gain: 0.12 },
    ],
  ],
  scroll: [wheel(3600), wheel(4200), wheel(3900)],
}
