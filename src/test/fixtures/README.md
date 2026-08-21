# Test fixtures

**`tournament-2025.json`** — the commissioner's 2025 dry run of the Cup format: a full 36-team
bracket seeded against the real 2025 season, used to prove the format worked before it was adopted.
It never happened as a competition, so it is not published under `public/data` (the site only shows
Cups that are actually contested — the first is 2026). It stays here because resolving it against
the real 2025 tier data is the engine's best end-to-end test: 36 → 18 → 9 → drop 1 → 8 → 4 → 2 → 1.
