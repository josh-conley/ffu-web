import { type Note, type Voice } from './types'

// A cabinet in a dark room, all bare square waves like the sound chips of the day. Taking a coin
// and powering up; then lasers, coins and jumps on every press, a level-clear run when you change
// page, and a scale that climbs and falls with the page as you scroll.

const POWER_UP = [261.63, 329.63, 392, 523.25, 659.25, 783.99, 1046.5]
/** C major pentatonic over two octaves: scrolling plays up and down it. */
const SCALE = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99, 880]

export const arcade: Voice = {
  chime: [
    { type: 'square', hz: 987.77, at: 0, dur: 0.08, gain: 0.05 },
    { type: 'square', hz: 1318.5, at: 0.08, dur: 0.35, gain: 0.05 },
    ...POWER_UP.map((hz, i): Note => ({ type: 'square', hz, at: 0.5 + i * 0.07, dur: 0.08, gain: 0.05 })),
    { type: 'square', hz: 1046.5, at: 0.99, dur: 0.5, gain: 0.05 },
    { type: 'triangle', hz: 130.81, at: 0.5, dur: 0.95, gain: 0.12 },
  ],
  // Level clear.
  nav: [
    ...[523.25, 659.25, 783.99, 1046.5].map((hz, i): Note => ({ type: 'square', hz, at: i * 0.06, dur: 0.07, gain: 0.08 })),
    { type: 'square', hz: 1318.5, at: 0.24, dur: 0.22, gain: 0.08 },
    { type: 'triangle', hz: 130.81, at: 0, dur: 0.4, gain: 0.15 },
  ],
  click: [
    // Laser.
    [{ type: 'sawtooth', hz: 1900, toHz: 160, at: 0, dur: 0.16, gain: 0.12 }],
    // Coin.
    [
      { type: 'square', hz: 987.77, at: 0, dur: 0.06, gain: 0.09 },
      { type: 'square', hz: 1318.5, at: 0.06, dur: 0.24, gain: 0.09 },
    ],
    // Jump.
    [{ type: 'square', hz: 260, toHz: 1000, at: 0, dur: 0.16, gain: 0.09 }],
    // Explosion.
    [
      { type: 'noise', hz: 900, toHz: 120, q: 0.6, at: 0, dur: 0.28, gain: 0.3 },
      { type: 'square', hz: 110, toHz: 40, at: 0, dur: 0.2, gain: 0.1 },
    ],
  ],
  scroll: SCALE.map((hz): Note[] => [{ type: 'square', hz, at: 0, dur: 0.07, gain: 0.07 }]),
}
