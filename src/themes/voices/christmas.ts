import { clip, takes, type Voice } from './types'

// A sleigh going by, all recorded. Real sleigh bells ring when you switch to the skin, when you
// change page, and shake as you scroll; presses are bell strikes, a glass clink and more sleigh
// bells by turns.

export const christmas: Voice = {
  chime: clip('christmas/chime'),
  nav: clip('christmas/nav'),
  click: takes('christmas/click', 5),
  scroll: takes('christmas/scroll', 4),
}
