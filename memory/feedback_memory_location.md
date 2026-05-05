---
name: Write memory directly to repo, not local mirror
description: For the wirefold project, save memory files only to repo `memory/`; skip the local Claude memory dir entirely
type: feedback
---

For this project, write memory files directly to the repo's
`memory/` directory and update `MEMORY.md`. Do not write
the same memory into the local Claude memory dir at
`~/.claude/projects/-Users-David-Documents-github-wirefold/memory/`
and then mirror it. One source of truth, no drift.

**Why:** the mirror step doubles work and lets the two indexes
desync. The repo-only location also keeps memory portable across
AI systems per the post-v0 no-lock-in rule (see
`feedback_workflow_post_v0.md`).

**How to apply:** any new feedback/project/reference memory for
this project goes straight to `memory/<name>.md` with an entry
appended to `MEMORY.md`. The default auto-memory path
under `~/.claude/...` is overridden for this project specifically.
