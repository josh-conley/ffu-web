import { bracketWings } from './bracketWings'

it('puts the Cup opening round\'s two extra games at the foot of the left wing', () => {
  expect(bracketWings(18)).toEqual({ left: [0, 1, 2, 3, 4, 5, 6, 7, 16, 17], right: [8, 9, 10, 11, 12, 13, 14, 15] })
})

it('keeps the ninth Round of 18 game on the left, beside the two games that feed it', () => {
  expect(bracketWings(9)).toEqual({ left: [0, 1, 2, 3, 8], right: [4, 5, 6, 7] })
})

it('halves a power-of-two round, and leaves a lone final for the middle', () => {
  expect(bracketWings(4)).toEqual({ left: [0, 1], right: [2, 3] })
  expect(bracketWings(2)).toEqual({ left: [0], right: [1] })
  expect(bracketWings(1)).toEqual({ left: [0], right: [] })
  expect(bracketWings(0)).toEqual({ left: [], right: [] })
})
