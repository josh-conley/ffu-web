// The draw announcer.
//
// Deliberately built around PHRASE TOKENS rather than a finished sentence. A token says what is
// meant ("this team", "versus"), not how to render it — so the browser-speech voice below can turn
// tokens into text, and a future clip-based voice can map the very same tokens onto pre-generated
// audio files without a single change at the call site. Browser speech is the prototype; it gets
// the timing right, and it will never sound like a game announcer.

export type AnnouncePhrase =
  | { kind: 'team'; ffuId: string; name: string }
  | { kind: 'word'; text: string }

export interface Voice {
  /** Say these phrases in order, interrupting anything already in progress. */
  speak(phrases: AnnouncePhrase[]): void
  cancel(): void
  /** False when the platform can't do it at all — callers stay silent rather than erroring. */
  available(): boolean
}

/**
 * Spoken forms for names a synthesiser mangles, keyed by ffuId. Only the ones that actually come
 * out wrong — everything else is read as written.
 *
 * This map is why pre-generating clips is the better long-term route: there you HEAR each name and
 * fix it until it's right, rather than guessing at a respelling.
 */
export const SPOKEN_NAMES: Record<string, string> = {
  'ffu-002': 'Effed Up', // FFUcked Up
  'ffu-047': 'B Star', // bstarrr
  'ffu-053': 'John of Arc', // Jawn of Arc
  'ffu-038': 'Odin\'s Hair', // Odin's Herr
  'ffu-027': 'Cam Delphia', // CamDelphia
  'ffu-040': 'The Sha Dynasty', // The Sha'Dynasty
  'ffu-015': 'Arcorey', // arcorey15
  'ffu-016': 'Mustache Poppy', // MustachePapi
  'ffu-010': 'Chicago Pick Six', // ChicagoPick6
}

/** What the announcer should call this team. */
export function spokenName(ffuId: string, name: string): string {
  return SPOKEN_NAMES[ffuId] ?? name
}

/** The call for one tie. Kept pure so the wording is testable without a speech engine. */
export function tiePhrases(a: { ffuId: string; name: string }, b: { ffuId: string; name: string }, firstMeeting: boolean): AnnouncePhrase[] {
  const phrases: AnnouncePhrase[] = [
    { kind: 'team', ffuId: a.ffuId, name: a.name },
    { kind: 'word', text: 'versus' },
    { kind: 'team', ffuId: b.ffuId, name: b.name },
  ]
  // A pairing with no history is worth calling out — it lands about six times in ten.
  if (firstMeeting) phrases.push({ kind: 'word', text: 'First ever meeting!' })
  return phrases
}

/** Tokens → one utterance. Ellipses buy a beat between names, which is most of the announcer feel. */
export function toText(phrases: AnnouncePhrase[]): string {
  return phrases
    .map((p) => (p.kind === 'team' ? spokenName(p.ffuId, p.name) : p.text))
    .join('... ')
}

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
}

/** Prefer a full-bodied English voice; fall back to whatever the platform defaults to. */
function pickVoice(engine: SpeechSynthesis): SpeechSynthesisVoice | null {
  const voices = engine.getVoices()
  if (voices.length === 0) return null
  const english = voices.filter((v) => v.lang.startsWith('en'))
  return english.find((v) => v.localService && v.name.includes('Daniel')) ?? english[0] ?? voices[0] ?? null
}

/** The prototype voice: whatever the operating system can already say. */
export const browserVoice: Voice = {
  available: () => synth() !== null,

  speak(phrases) {
    const engine = synth()
    if (!engine) return
    engine.cancel() // never let two ties talk over each other
    const utterance = new SpeechSynthesisUtterance(toText(phrases))
    const voice = pickVoice(engine)
    if (voice) utterance.voice = voice
    // Slower and lower than default: closer to an arena announcer, further from a satnav.
    utterance.rate = 0.95
    utterance.pitch = 0.8
    utterance.volume = 1
    engine.speak(utterance)
  },

  cancel() {
    synth()?.cancel()
  },
}
