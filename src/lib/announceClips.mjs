// The announcer's fixed vocabulary, shared by the CLIP GENERATOR (scripts/generate-draw-vo.mjs,
// run under bare node) and the app that plays the clips back. Plain ESM for the same reason
// cupDraw.mjs is: one definition, two runtimes, no chance of the filenames drifting from the
// lookups.

/**
 * Spoken forms for names a synthesiser mangles, keyed by ffuId. Only the ones that come out wrong.
 * With generated clips you HEAR each name, so this list grows by listening, not guessing.
 */
export const SPOKEN_NAMES = {
  'ffu-002': 'Effed Up', // FFUcked Up
  'ffu-047': 'B Star', // bstarrr
  'ffu-053': 'John of Arc', // Jawn of Arc
  'ffu-038': "Odin's Hair", // Odin's Herr
  'ffu-027': 'Cam Delphia', // CamDelphia
  'ffu-040': 'The Sha Dynasty', // The Sha'Dynasty
  'ffu-015': 'Arcorey', // arcorey15
  'ffu-016': 'Mustache Poppy', // MustachePapi
  'ffu-010': 'Chicago Pick Six', // ChicagoPick6
}

/** What the announcer should call this team. */
export function spokenName(ffuId, name) {
  return SPOKEN_NAMES[ffuId] ?? name
}

/** Every non-team phrase the announcer can say. The generator renders exactly this list. */
export const ANNOUNCE_WORDS = ['versus', 'First ever meeting!']

/** Stable filename stem for a phrase — the one thing the generator and the player must agree on. */
export function clipKey(phrase) {
  if (phrase.kind === 'team') return `team-${phrase.ffuId}`
  return `word-${phrase.text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
}
