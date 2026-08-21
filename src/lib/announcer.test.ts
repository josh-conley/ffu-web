import { browserVoice, spokenName, tiePhrases, toText } from './announcer'

// The wording is pure, so it is testable without a speech engine — which is the point of splitting
// phrase tokens from rendering. A clip-based voice would consume the same tokens.

describe('spokenName', () => {
  it('respells the names a synthesiser mangles', () => {
    expect(spokenName('ffu-002', 'FFUcked Up')).toBe('Effed Up')
    expect(spokenName('ffu-053', 'Jawn of Arc')).toBe('John of Arc')
  })

  it('reads everything else as written', () => {
    expect(spokenName('ffu-001', 'The Stallions')).toBe('The Stallions')
  })
})

describe('tiePhrases', () => {
  const a = { ffuId: 'ffu-001', name: 'The Stallions' }
  const b = { ffuId: 'ffu-002', name: 'FFUcked Up' }

  it('calls the drawing team, then versus, then the drawn team', () => {
    expect(tiePhrases(a, b, false)).toEqual([
      { kind: 'team', ffuId: 'ffu-001', name: 'The Stallions' },
      { kind: 'word', text: 'versus' },
      { kind: 'team', ffuId: 'ffu-002', name: 'FFUcked Up' },
    ])
  })

  it('adds the first-meeting call only when they have never played', () => {
    expect(tiePhrases(a, b, true).at(-1)).toEqual({ kind: 'word', text: 'First ever meeting!' })
  })
})

describe('toText', () => {
  it('renders tokens with a beat between them, applying pronunciations', () => {
    const a = { ffuId: 'ffu-001', name: 'The Stallions' }
    const b = { ffuId: 'ffu-002', name: 'FFUcked Up' }
    expect(toText(tiePhrases(a, b, false))).toBe('The Stallions... versus... Effed Up')
  })
})

describe('browserVoice', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reports unavailable when the platform has no speech synthesis', () => {
    // jsdom has none by default.
    expect(browserVoice.available()).toBe(false)
    // ...and speaking is a no-op rather than a crash mid-broadcast.
    expect(() => browserVoice.speak(tiePhrases({ ffuId: 'x', name: 'X' }, { ffuId: 'y', name: 'Y' }, false))).not.toThrow()
  })

  it('cancels anything in progress before speaking, so ties never overlap', () => {
    const calls: string[] = []
    vi.stubGlobal('speechSynthesis', {
      cancel: () => calls.push('cancel'),
      speak: () => calls.push('speak'),
      getVoices: () => [],
    })
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      text: string
      constructor(text: string) {
        this.text = text
      }
    })
    browserVoice.speak(tiePhrases({ ffuId: 'x', name: 'X' }, { ffuId: 'y', name: 'Y' }, false))
    expect(calls).toEqual(['cancel', 'speak'])
  })
})
