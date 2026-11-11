import { clip, steps, takes, type Voice } from './types'

// Code coming down the wire. A burst of falling data over a low hum to begin; after that every
// press is a terminal: a heavy key, a glitch, a system thump. Changing page is a stream of data
// draining away, and scrolling is the trickle of characters going past.

export const matrix: Voice = {
  chime: [
    ...steps(14, (i) => [{ type: 'square', hz: 2400 - i * 130 + (i % 3) * 220, at: i * 0.045, dur: 0.04, gain: 0.03 }]),
    { type: 'sawtooth', hz: 55, at: 0, dur: 1.4, gain: 0.08, attack: 0.5 },
    { type: 'sine', hz: 110, at: 0, dur: 1.4, gain: 0.1, attack: 0.5 },
    { type: 'sine', hz: 880, at: 0.7, dur: 0.6, gain: 0.05 },
  ],
  nav: clip('matrix/nav', 0.6),
  click: takes('matrix/click', 3, 0.6),
  scroll: takes('matrix/scroll', 4),
}
