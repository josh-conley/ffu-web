import { steps, type Note, type Voice } from './types'

// The farmyard and the kitchen. Two turkey gobbles to open; then on every press a short gobble,
// a wooden spoon on a pot, or the oven timer; a long gobble when you change page; and dry leaves
// underfoot as you scroll.

/** A gobble: quick falling blips that wobble up and down as they descend. */
const gobble = (start: number, count: number, gain: number): Note[] =>
  steps(count, (i) => {
    const hz = 620 - i * 28 + (i % 2 ? 70 : 0)
    return [{ type: 'sawtooth', hz, toHz: hz * 0.78, at: start + i * 0.055, dur: 0.05, gain }]
  })
const leaves = (from: number, to: number): Note[] => [
  { type: 'noise', hz: from, toHz: to, q: 1, at: 0, dur: 0.06, gain: 0.28 },
  { type: 'noise', hz: 900, q: 1, at: 0.03, dur: 0.04, gain: 0.18 },
]

export const thanksgiving: Voice = {
  chime: [...gobble(0, 10, 0.07), ...gobble(0.75, 7, 0.07)],
  nav: gobble(0, 8, 0.11),
  click: [
    gobble(0, 4, 0.12),
    // A wooden spoon on the side of a pot.
    [
      { type: 'sine', hz: 540, at: 0, dur: 0.22, gain: 0.22 },
      { type: 'sine', hz: 1490, at: 0, dur: 0.1, gain: 0.1 },
      { type: 'noise', hz: 2000, q: 2, at: 0, dur: 0.02, gain: 0.2 },
    ],
    // The oven timer.
    [
      { type: 'sine', hz: 2400, at: 0, dur: 0.3, gain: 0.14 },
      { type: 'sine', hz: 3610, at: 0, dur: 0.18, gain: 0.05 },
    ],
  ],
  scroll: [leaves(2500, 1400), leaves(3200, 1800), leaves(2100, 3000), leaves(2800, 1600)],
}
