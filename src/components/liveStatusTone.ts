import type { PlayerLiveStatus } from '@/selectors'

// How a live box score styles a player by where their NFL game stands (the dot beside the name
// says the same thing). Only points still coming in read at full strength; a finished game's points
// and a player yet to play (or with no game) are muted, the latter with a dash in place of a 0.00
// that hasn't been earned or lost yet. A finished game keeps its number, even a 0.00 — that zero
// is real. A past week's box score (no status at all) reads as plain text.

const NAME_TONE: Partial<Record<PlayerLiveStatus, string>> = { pre: 'text-muted', idle: 'text-muted' }
const POINTS_TONE: Partial<Record<PlayerLiveStatus, string>> = { final: 'text-muted', pre: 'text-muted', idle: 'text-muted' }

export const nameTone = (status: PlayerLiveStatus | undefined) => (status ? NAME_TONE[status] ?? '' : '')
export const pointsTone = (status: PlayerLiveStatus | undefined) => (status ? POINTS_TONE[status] ?? '' : '')
export const pointsText = (points: number, status: PlayerLiveStatus | undefined) => (status === 'pre' ? '—' : points.toFixed(2))
