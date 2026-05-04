---
name: Industry-pattern review deferred items
description: Visual-editor gaps surfaced by the 2026-05-03 industry-pattern review that are intentionally deferred — surface them when relevant friction appears
type: project
---

The 2026-05-03 industry-standard-pattern review (entry in
`docs/planning/visual-editor/session-log.md`) produced a coverage
matrix and triage. Quick wins (MiniMap, fit-view keybindings,
rounded snake corners, port-reject UI cue) shipped on
`task/industry-pattern-review` (commit `689fd7d`). The rest are
deferred per the post-v0 friction-driven posture.

**Deferred — bring up when matching friction appears:**

- *Copy / paste / duplicate* (M). Surface when the user duplicates
  similar subgraphs by hand or asks for a "duplicate" gesture.
- *Edge display labels* (M). Channel-name `edge.label` exists but
  is invisible; surface when the user asks "which channel is
  this?" or when wiring goes wrong because labels weren't visible.
- *Multi-node alignment guides* (S). Surface when the user
  comments that guides "stop working" while moving a selection.
- *Drag-stop undo coalescing* (S). Surface when the user notices
  multi-node drags take N undo presses to revert.
- *Auto-routing with obstacle avoidance* (L, prefer ELK or
  libavoid-js). Surface when "edges crossing through nodes" gets
  logged as friction.
- *Auto-layout (dagre / ELK one-shot)* (M-L). Surface when a
  larger spec generates complaints about hand-placement.

**Why:** the review identified these as real gaps vs. industry
norms, but the post-v0 rule is don't open branches preemptively —
wait for friction. The risk without this memory is forgetting the
analysis exists and re-doing it next time the topic comes up.

**How to apply:** when the user says something that maps onto one
of the bullets above (e.g. "I keep redoing the same wiring",
"which channel is this edge?", "this drag took five undos"), name
the matching deferred item and offer to open the corresponding
task branch. Don't volunteer the list unprompted.

**The quick wins themselves are placeholders for canonical
replacements, not load-bearing.** Different dynamic from
`feedback_visuals_scrutiny.md` (which is about iterative
point-tuning losing ground): these are stable baseline
checkboxes that get swapped out wholesale when the industry
solution is adopted.

- Rounded snake/below corners in `AnimatedEdge.tsx` (segs stay
  straight, dot cuts corner by ≤ `r` px) — subsumed by adopting a
  real router. Delete the rounding branch then.
- `flashRejectedHandle` in `app.tsx` (DOM querySelector + class
  toggle on one failure mode) — subsumed by a general validation /
  user-feedback channel. Replace, don't extend, when that lands.
- `f` / `shift+f` keybindings hardcoded in the cmd-z effect —
  fold into a keybinding registry once a third+ shortcut shows up.
- MiniMap is the one likely to survive as-is.

When the unified work starts, name these explicitly as "removing,
not preserving" so the diff is clean.
