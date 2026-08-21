import { clipKey } from './announceClips.mjs'
import { tiePhrases } from './announcer'

// The contract that matters between the generator and the player: the filenames the script writes
// are exactly the ones the player asks for. A mismatch would be silent — clips simply never play —
// so it is worth asserting directly.

describe('clipKey', () => {
  it('names a team clip by its ffuId', () => {
    expect(clipKey({ kind: 'team', ffuId: 'ffu-001', name: 'The Stallions' })).toBe('team-ffu-001')
  })

  it('slugs a word clip, so punctuation never reaches a filename', () => {
    expect(clipKey({ kind: 'word', text: 'First ever meeting!' })).toBe('word-first-ever-meeting')
    expect(clipKey({ kind: 'word', text: 'versus' })).toBe('word-versus')
  })

  it('covers every phrase a tie can produce', () => {
    const phrases = tiePhrases(
      { ffuId: 'ffu-001', name: 'The Stallions' },
      { ffuId: 'ffu-002', name: 'FFUcked Up' },
      true,
    )
    expect(phrases.map(clipKey)).toEqual([
      'team-ffu-001',
      'word-versus',
      'team-ffu-002',
      'word-first-ever-meeting',
    ])
  })
})

describe('the shipped clip set', () => {
  it('contains a clip for every key the player will ask for', async () => {
    const manifest = (await import('../../public/audio/draw/manifest.json')).default as { keys: string[] }
    const keys = new Set(manifest.keys)
    // Both connectives...
    expect(keys.has('word-versus')).toBe(true)
    expect(keys.has('word-first-ever-meeting')).toBe(true)
    // ...and a team clip for a sample of real members, including a respelled one.
    for (const ffuId of ['ffu-001', 'ffu-002', 'ffu-053', 'ffu-060']) {
      expect(keys.has(`team-${ffuId}`), ffuId).toBe(true)
    }
  })
})
