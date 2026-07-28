# Decisions

Short ADR-style notes for choices that aren't obvious from the code and would otherwise get
re-litigated. Newest first. Keep each entry to what was decided, why, and what it constrains.

---

## 2026-07-28 — When a season counts as "started"

**Decision.** A season is *entered* once its **draft has completed**, and *played out* once it has
been backfilled into `public/data/**`. These are two different facts and the site treats them
differently:

| | Governed by | Examples |
|---|---|---|
| **Membership** — who is in which league | draft complete | directory presence, tier trail, tier streaks, "which league is X in" |
| **Performance** — how they did | season backfilled | record, points, win%, UPR, placements, championships, averages |

**Why.** The draft is the moment the field stops being provisional: rosters are final and anyone who
signed up but didn't show has dropped out. It's also observable rather than a judgment call —
Sleeper moves `league.status` `pre_draft` → `drafting` → `in_season`, and the draft object carries
its own status — so it stays data, not a hardcoded date (Charter: "era is data, not branching").

Performance aggregates must NOT flip at the draft. Mid-season `finalPlacement` is null, and a
win% or average-finish computed over three games would swing wildly week to week, destabilising
every number on Stats and Members until January. Career stats are a record of completed play.

**Consequences.**
- Two legitimate season counts exist, differing for one year at a time: seasons *entered* vs
  seasons *played out*. They must never both render as a bare number without a label — name them
  distinctly in code (`seasonsEntered` vs the existing `CareerStats.seasons`) if the first is ever
  needed outside the home page.
- Until 2026 is drafted, its members exist only in the home page's "2026 Leagues" section, which
  reads live from Sleeper. `Members.tsx` builds its directory from `careerStats(seasons)`, and a
  member with zero completed seasons never enters that map — so a brand-new member (ffu-057,
  ffu-058) has no directory entry or detail page until the backfill. Closing that gap means feeding
  the upcoming rosters into the directory as a "Joining 2026" group; deliberately deferred.
- The home page shows the upcoming season as a **hollow** tier dot (filled = played, ring = signed
  up) and counts forward — "9th season", not "8 seasons" — so nothing implies a season was played.
  When 2026 is backfilled the dot fills in on its own.

**Not yet built.** Nothing reads `league.status` today; the hollow dot appears as soon as ids are in
`LIVE_LEAGUE_IDS`, i.e. pre-draft, which is honest ("signed up"). The draft-status plumbing only
becomes necessary when something membership-shaped (the directory group above) needs to flip at a
precise moment. See `ai-docs/TODO.md`.
