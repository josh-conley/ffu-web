---
name: partners
description: Run the "agent partners" brainstorm — the product-owner and ux-partner agents pitch independently, then read and react to each other's ideas, then converge on a joint recommendation for what to do next. Use when Josh mentions the agent partners / the partners / the team, or asks them to brainstorm, or asks broadly "what should we do next with the site?".
---

# Agent partners brainstorm

The partners are two read-only subagents in `.claude/agents/`: **product-owner** (features, stats,
the commissioner's view) and **ux-partner** (design, usability, a11y, mobile). They don't share a
context, so you moderate: you carry each one's words to the other, verbatim, and keep the rounds
honest. They talk to each other through you; you don't put words in their mouths.

## 0. The brief
Take Josh's focus if he gave one ("the Cup page", "things for playoff time", "quick wins only").
With no focus, the brief is "what should we do next with the site?". Don't ask him to clarify a
broad request: broad is a valid brief.

## 1. Round 1: independent pitches (parallel)
Spawn both agents **in one message** with the Agent tool (`subagent_type: product-owner` and
`subagent_type: ux-partner`), each given the brief and told: "This is round 1 of a partners
brainstorm; the other partner will read your list and respond." Keep each agent's id: rounds 2–3
continue the same agents with SendMessage so they keep what they already read.

## 2. Round 2: cross-talk (parallel)
Send each partner the other's round-1 list **verbatim**, with this ask:
> Here is <the other partner>'s list. Respond as their partner, not their reviewer:
> - **Back:** which of theirs you'd champion, and what your angle adds to it.
> - **Push back:** which you'd cut or change, and why. Disagree plainly when you disagree.
> - **Combine:** where one of theirs and one of yours are better as one idea.
> - **Revised top 3:** your top three across BOTH lists now.
> Under ~400 words.

## 3. Round 3: only if they genuinely disagree
If their revised top 3s conflict on something that matters (one's top pick is the other's cut),
send each the other's round-2 reply once and ask for a final position in under ~150 words. Stop
there: two exchanges is the cap. Unresolved disagreement goes to Josh as a disagreement.

## 4. Converge and report to Josh
Write the joint recommendation yourself, from what they said (quote or attribute, don't invent):

- **Do next:** the one thing both partners would do first, or your pick between their two with
  the reason. Size it (S/M/L).
- **Shortlist (3–5):** each idea with a one-line pitch, who backed it (PO / UX / both), size, and
  any combined form that came out of round 2.
- **Where they disagreed:** each split in one or two lines, both sides, and what Josh would need
  to decide. Don't average it away.
- **Dropped:** a one-line list of what was cut in discussion and why, so it isn't re-pitched.

**Tone:** the partners are tools, not colleagues or stakeholders. Report what they found and
proposed ("the UX pass measured…", "PO suggests…"), never what they "want", "need" or "insist on",
and never turn a timing observation into a deadline for Josh ("both want it by Sunday"). Timing
context is fine as a plain fact ("week 3 kicks off Sunday").

Keep it under ~500 words. Offer to start the "do next" item on a `preview/` branch; don't start
it until Josh picks.

## 5. Record the outcome
After Josh reacts, add one line per idea he ruled on to `ai-docs/IDEAS.md`
(agent = `partners` for joint ideas), and put accepted ones into `ai-docs/TODO.md`. Commit to
`main` as docs.
