### 10. Architectural tradeoffs

**What it checks.** The big design choices still hold up; nothing
has quietly drifted into incoherence.

- **Spec / viewer split.** Nothing in `topology.json` is ignored by
  `topogen`; nothing in `topology.view.json` is depended on by the
  Go runtime. Drift here is the single most damaging architectural
  rot for this project.
- **Codegen as authority.** Hand-edits to generated Go would break
  the round-trip; check for "do not edit" headers and that
  hand-edits aren't being made.
- **Substrate lock-in.** What's borrowed from React Flow vs what's
  custom. Surfaces where a React Flow API choice has bled into
  application logic (would make swapping painful).
- **Two-stack undo design.** Documented in Phase 8; the rename +
  node-delete vs undo gap is in the candidate pool. Audit whether
  any new mutations have been added that bypass the undo stack.
- **Animation model.** Phase 5.5 rewrote this; check that newer
  features built on it haven't reintroduced the patterns that
  rewrite was supposed to eliminate.
- **Plugin / topogen boundary.** The plugin should not encode
  knowledge that belongs in `topogen`, and vice versa.

**Passing.** Findings list; each surfaced drift either accepted
with reason or scheduled as task work.

**Cadence.** On demand. Quarterly is plausible; or when a new
substrate is being considered.

**Cost.** Medium ($10–$20).
