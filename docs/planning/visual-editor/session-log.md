# Visual editor — real-world session log

Append-only log of friction surfaced while actually using the visual
editor (the VS Code extension at `tools/topology-vscode/`). One entry
per session. Brief and concrete: what was attempted, what jerked /
stalled / surprised / produced wrong Go, rough time/feel.

This log is the primary artifact driving post-v0 work. Rewrites and
fixes are justified by patterns here, not by speculative planning.
See the parent plan at [../visual-editor-plan.md](../visual-editor-plan.md)
for the surrounding posture, and [audits.md](audits.md) for the
audit registry.

## Entry format

```
## YYYY-MM-DD — <short task description>

**Branch:** task/<branch-name>
**Mode:** edit / smoothness audit / replay review / etc.
**Duration:** ~Nm

- Observation 1 (where, what, what was expected vs what happened)
- Observation 2
- ...

**Followups (candidates, not commitments):**
- ...
```

## Sessions

*No sessions yet.*
