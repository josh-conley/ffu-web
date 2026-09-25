import { pointsText, pointsTone } from './liveStatusTone'

describe('pointsText', () => {
  it('dashes only a player whose game has not started', () => {
    expect(pointsText(0, 'pre')).toBe('—')
  })

  it('shows a real 0.00 once a player has played or is playing', () => {
    expect(pointsText(0, 'final')).toBe('0.00')
    expect(pointsText(0, 'live')).toBe('0.00')
    expect(pointsText(0, 'idle')).toBe('0.00')
    expect(pointsText(0, undefined)).toBe('0.00')
  })
})

describe('pointsTone', () => {
  it('keeps live points at full strength and mutes the rest', () => {
    expect(pointsTone('live')).toBe('')
    expect(pointsTone('final')).toBe('text-dim')
    expect(pointsTone('pre')).toBe('text-dim')
    expect(pointsTone(undefined)).toBe('')
  })
})
