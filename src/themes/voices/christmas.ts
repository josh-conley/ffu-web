import { bell, steps, type Note, type Voice } from './types'

// A sleigh going by. Sleigh bells under three rising bell notes to open; then a bell on every
// press, a different note each time so presses add up to a peal; a run of sleigh bells into a
// chime when you change page; and the sleigh bells themselves shaking as you scroll.

/** One shake of sleigh bells: a hiss of very high noise with two metallic partials in it. */
const jingle = (at: number, gain: number, tune = 1): Note[] => [
  { type: 'noise', hz: 7000 * tune, q: 3, at, dur: 0.09, gain },
  { type: 'sine', hz: 5200 * tune, at, dur: 0.08, gain: gain * 0.15 },
  { type: 'sine', hz: 6400 * tune, at, dur: 0.08, gain: gain * 0.15 },
]
/** The peal the presses walk through. */
const PEAL = [1318.5, 1568, 2093, 1760, 1568]

export const christmas: Voice = {
  chime: [
    ...steps(6, (i) => jingle(i * 0.15, 0.14)),
    ...bell(1318.5, 0, 0.8, 0.09),
    ...bell(1568, 0.3, 0.8, 0.09),
    ...bell(2093, 0.6, 1.3, 0.09),
  ],
  nav: [...steps(4, (i) => jingle(i * 0.09, 0.2)), ...bell(1568, 0.3, 0.35, 0.16), ...bell(2093, 0.42, 0.6, 0.16)],
  click: PEAL.map((hz): Note[] => [...bell(hz, 0, 0.5, 0.2), ...jingle(0, 0.16)]),
  scroll: [jingle(0, 0.26), jingle(0, 0.22, 0.92), jingle(0, 0.26, 1.06), jingle(0, 0.2, 0.97)],
}
