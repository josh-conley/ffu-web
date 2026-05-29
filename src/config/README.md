# config

Hand-authored TS source of truth: members (the `ffuId` registry + owners) and the season
registry. Platform IDs (`sleeper`/`espn`) live here **only** — they never leak downstream.
The migration also emits JSON mirrors (`members.json`/`seasons.json`) read by the provider.
