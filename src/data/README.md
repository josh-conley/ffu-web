# data

The **only** data boundary. Normalized domain types (`types.ts`), the `LeagueDataProvider` /
`LineupProvider` interfaces, and the `StaticFileProvider` implementation. All methods are async
and domain-phrased so a future `ApiProvider` is a one-file swap. No `fetch` lives above this layer.
