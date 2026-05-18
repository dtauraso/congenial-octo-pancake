---
name: feedback-delegate-by-default
description: "David expects delegation to haiku/sonnet subagents by default for executor-style work; don't ask each time."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: ba4bb05f-138d-4a9d-bedd-eca6a7346249
---

Delegate to subagents by default without re-asking. David confirmed
this explicitly on task/editor-friction-pass after item 1 landed via a
sonnet subagent.

**Why:** CLAUDE.md already names delegation as the default ("Delegation
is the default, not the exception"). Asking "should I delegate?" each
time is exactly the per-step sign-off the post-v0 workflow relaxed.
See [[feedback-dont-pause-after-go]].

**How to apply:** For grep sweeps, mechanical edits, scoped edit specs,
multi-file investigations — spawn an Agent (sonnet for edits, haiku
for read-only) without asking. Main Opus session stays on judgment,
planning, synthesis. If David wants inline work, he'll say "don't
delegate."
