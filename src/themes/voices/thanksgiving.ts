import { clip, takes, type Voice } from './types'

// The farmyard and the kitchen, all recorded. A real turkey gobbles when you switch to the skin,
// again when you change page, and now and then on a press; other presses are a pot, a knife on a
// board, a plate. Scrolling is footsteps through grass and leaves.

export const thanksgiving: Voice = {
  chime: clip('thanksgiving/gobble-1'),
  nav: clip('thanksgiving/gobble-2'),
  click: [clip('thanksgiving/gobble-3'), ...takes('thanksgiving/click', 3)],
  scroll: takes('thanksgiving/scroll', 4),
}
