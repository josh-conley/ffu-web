/** Where a player's FFU history lives — the one place the route is spelled out for links. */
export const playerPath = (playerId: string) => `/players/${encodeURIComponent(playerId)}`
