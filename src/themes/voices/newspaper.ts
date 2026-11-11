import { bell, later, type Note, type Voice } from './types'

// A newsroom. A run of typewriter keys, the margin bell and the carriage thrown back to open;
// then keys on every press (one, two, or a burst), the bell and carriage when you change page,
// and newsprint rustling as you scroll.

const key = (hz: number): Note[] => [
  { type: 'noise', hz, q: 1.2, at: 0, dur: 0.035, gain: 0.34 },
  { type: 'sine', hz: 160, toHz: 90, at: 0, dur: 0.05, gain: 0.2 },
]
const CARRIAGE: Note[] = [
  ...bell(2093, 0, 0.7, 0.16),
  { type: 'noise', hz: 900, toHz: 2200, q: 0.9, at: 0.12, dur: 0.3, gain: 0.2, attack: 0.05 },
  { type: 'sine', hz: 140, toHz: 70, at: 0.42, dur: 0.08, gain: 0.3 },
]
const rustle = (from: number, to: number): Note[] => [
  { type: 'noise', hz: from, toHz: to, q: 0.8, at: 0, dur: 0.09, gain: 0.2, attack: 0.02 },
]
const TYPED = [0, 0.09, 0.17, 0.3, 0.38, 0.47, 0.6, 0.68]

export const newspaper: Voice = {
  chime: [...TYPED.flatMap((at) => later(key(2200), at)), ...later(CARRIAGE, 0.82)],
  nav: CARRIAGE,
  click: [
    key(2200),
    [...key(2500), ...later(key(2000), 0.09)],
    [...key(2100), ...later(key(2600), 0.07), ...later(key(2300), 0.15)],
  ],
  scroll: [rustle(2400, 5200), rustle(3600, 2000), rustle(3000, 6000), rustle(4400, 2600)],
}
