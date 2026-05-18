---
name: tight-delegate-prompts
description: Keep Agent/subagent prompts terse — goal, paths, edits, verify, constraints; no prose framing
metadata:
  type: feedback
---

Agent prompts should be ~15 lines, not ~40. Structure:

1. One-line goal.
2. Files to read (paths only).
3. Bulleted concrete edits with file:line when known.
4. One-line verify (build/test command).
5. One-line constraints (branch, no merge, no amend, push or not).

**Why:** David called out a 40-line delegate prompt as too verbose. Long prompts spend tokens restating context the agent can derive from the files, and the prose framing ("read first", "implement", "if ambiguous make a reasonable choice") is noise — the agent already knows to do those.

**How to apply:** Skip rationale paragraphs, alternative-considerations, and hedging. Trust the subagent to ask if blocked. Pair with [[delegate-by-default]] and [[delegate-executor-work]].
