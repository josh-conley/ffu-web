# Ideas

Log of ideas pitched by the `product-owner` and `ux-partner` agents (`.claude/agents/`) and what
Josh decided. The agents read this before pitching so they don't repeat themselves. Claude: after
Josh reacts to a pitch, add a line here. Accepted ideas also go into `TODO.md`; this file only
keeps the verdict.

Format: `- YYYY-MM-DD · <agent> · <idea> — <accepted | rejected | later>: <reason, one line>`

- 2026-09-25 · partners · Brand fonts load via <link> (were silently dropped in prod) — accepted: PR #11
- 2026-09-25 · partners · Matchup card pass: neutral live styling, series line, aria-labels, proj 11px — accepted: shipped
- 2026-09-25 · partners · Lineal belt marker on the title-bout matchup card — rejected: tried in the matchup-card preview, reverted before merge
- 2026-09-25 · partners · Home page: live week first + league jump links (phone only) — accepted: shipped
- 2026-09-25 · partners · Standings on a phone: toggle fits, narrower Rank so Record shows — accepted: shipped
- 2026-09-25 · ux-partner · League-colored text to AA-contrast tokens — later: Josh curious; changes newsletter screenshots, show a comparison first
- 2026-09-25 · product-owner · Left on the Bench block on Around the Union — later: not picked tonight
- 2026-09-25 · product-owner · All-play record + Luck columns on Standings — later: not picked tonight
- 2026-09-25 · ux-partner · SELECT control 44px tap target — later: unverified on a real iPhone
- 2026-09-25 · product-owner · Prize race "if the season ended today" — later: provisional money needs careful labelling
- 2026-09-25 · product-owner · Player links from box scores/drafts to /players — later: only outside whole-card buttons (nested interactive)
- 2026-09-25 · partners (deep) · Live scores first + 60s poll + "as of" + stop draft poll + dedupe Sleeper + defer projections — accepted: preview/live-scores
- 2026-09-25 · perf-specialist · Route splitting with React.lazy — accepted: preview/route-split
- 2026-09-25 · partners (deep) · Promotion/relegation ↑/↓ + cut lines + historical base rates on Standings — accepted: preview/standings-lines (playoff line pending the seeding rule)
- 2026-09-25 · partners (deep) · Team names/logos as real links, no nested buttons — accepted: preview/team-links
- 2026-09-25 · partners (deep) · Member page: Career/Rivals/Franchise players/Up-down/Milestones — accepted: preview/member-page
- 2026-09-25 · ux-partner · Tab titles, skip link, focus on nav, shared Dialog, menu-label alignment, 1024px header — accepted: preview/a11y-shell
- 2026-09-25 · product-owner · Season records on Records — later: open question on PPG/era ranking and one-dropdown placement
- 2026-09-25 · product-owner · Draft Hindsight — later: needs round-relative framing (46% of picks leave the roster)
- 2026-09-25 · product-owner · The Elevator as a Standings tab — rejected: too deep; per-member up/down goes on the member page
- 2026-09-25 · product-owner · Waiver-wire value — later: needs a Tuesday backfill; drop FAAB-per-point (unsound ratio)
- 2026-09-25 · ux-partner · /builds filter collapse on phones — later: low priority
- 2026-09-25 · sports-statistician · Playoff-odds simulation — later: not sound before ~week 8, and needs confirmed seeding/tiebreak rules
