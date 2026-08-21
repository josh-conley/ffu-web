import type { AnnouncePhrase } from './announcer'

export declare const SPOKEN_NAMES: Record<string, string>
export declare function spokenName(ffuId: string, name: string): string
export declare const ANNOUNCE_WORDS: string[]
export declare function clipKey(phrase: AnnouncePhrase): string
