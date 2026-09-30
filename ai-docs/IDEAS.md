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
- 2026-09-25 · partners (deep) · Promotion/relegation ↑/↓ + cut lines + historical base rates on Standings — rejected: PR #16 closed by Josh (2026-09-28)
- 2026-09-25 · partners (deep) · Team names/logos as real links, no nested buttons — accepted: preview/team-links
- 2026-09-25 · partners (deep) · Member page: Career/Rivals/Franchise players/Up-down/Milestones — accepted: shipped
- 2026-09-25 · ux-partner · Tab titles, skip link, focus on nav, shared Dialog, menu-label alignment, 1024px header — accepted: preview/a11y-shell
- 2026-09-25 · product-owner · Season records on Records — later: open question on PPG/era ranking and one-dropdown placement
- 2026-09-25 · product-owner · Draft Hindsight — later: needs round-relative framing (46% of picks leave the roster)
- 2026-09-25 · product-owner · The Elevator as a Standings tab — rejected: too deep; per-member up/down goes on the member page
- 2026-09-25 · product-owner · Waiver-wire value — later: needs a Tuesday backfill; drop FAAB-per-point (unsound ratio)
- 2026-09-25 · ux-partner · /builds filter collapse on phones — later: low priority
- 2026-09-25 · sports-statistician · Playoff-odds simulation — later: not sound before ~week 8, and needs confirmed seeding/tiebreak rules
- 2026-09-28 · partners (quick) · Member page polish: compact tiles, shared formatPoints, directory links, Compare label — accepted: preview/member-polish
- 2026-09-28 · product-owner · Prize races on Around the Union, no dollar amounts, "Leading now" — accepted: preview/prize-races
- 2026-09-28 · product-owner · Stats "Min seasons" default 3 — later: offered, not picked
- 2026-09-28 · product-owner · Remaining schedule on the member page (no SOS sort) — later: week 5+
- 2026-09-28 · product-owner · Game of the Week tag on live cards — later: cards already dense; same teams would win
- 2026-09-28 · product-owner · First UPR of 2026 block; weekly movement as signed numbers, not ▲/▼ — later
- 2026-09-28 · product-owner · Season grid (teams × weeks) — later: 15+ columns, shading contrast open
- 2026-09-28 · ux-partner · Stats filter collapse on phones — later: parked with /builds
- 2026-09-29 · partners · /cup/draw: page and CLI draw the same bracket (National sorted in drawCup) + check code — accepted: preview/wheel-brake
- 2026-09-29 · partners · /cup/draw operator safety: URL resume, confirm Start over, focus/repeat-proof space, downloads only at the end, seed in real case — accepted: preview/wheel-brake
- 2026-09-29 · partners · /cup/draw stream readability, landing hold, no fake spin, end-of-draw panel with copy image — accepted: preview/wheel-brake
- 2026-09-29 · product-owner · Draw card: tier gap + live 2026 records — dropped in discussion: adds a live fetch to a one-shot event
- 2026-09-29 · product-owner · Draw rehearsal banner (?rehearse=1) — dropped in discussion: a throwaway seed already marks a rehearsal
- 2026-09-29 · ux-partner · Draw reduced-motion override — dropped: rehearsal checklist item instead
- 2026-09-30 · claude · Marble-race draw reveal (real physics, crests assigned after the race) — rejected: prototype built (PR #42) and scrapped; the draw runs on a Discord video call, where fast motion doesn't survive the stream
- 2026-09-30 · claude · Last-crest-standing reveal + on-the-clock facts (PR #43) — rejected: not better than the original spinner; looking for new ideas
