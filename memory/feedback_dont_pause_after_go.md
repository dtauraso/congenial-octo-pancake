---
name: feedback-dont-pause-after-go
description: "When the user has named the frame and given the go-ahead, execute — don't pause again to confirm interface choices that fall out of the named decision."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 0872bd63-62a2-4636-9cbd-709007f1d87e
---

When the user has named the frame ("do the named map", "do A", etc.)
and the open decisions are recorded, just execute. Do not pause for
another sign-off on details that fall out of the named choice.

**Why:** In the 2026-05-14 InhibitRightGate session, after David said
"do the named map then" I stopped to ask permission again before
running the migration, and he replied "you aren't done?". Pausing
mid-stream when the user has already authorized the work wastes a
turn and reads as timidity, not caution.

**How to apply:** The substrate rule "state the next single concrete
step and wait" is about *new* substrate decisions, not about asking
re-confirmation for work the user just authorized. If the frame is
named and the decisions are on record, the next single step is to
*do* it, not to describe it and pause.

Related: [[feedback-substrate-landing-requires-editor-path]],
[[feedback-derive-model-from-visual-spec]].
