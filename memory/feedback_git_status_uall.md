---
name: Be cautious with git -u flags (past incident, details lost)
description: A past `-u` flag on some git command caused a problem; exact command and symptom not recalled
type: feedback
---

A past session had a problem with a `-u` flag on a git command. User remembers only the flag and "git command"; the exact subcommand and failure mode are not recalled across sessions.

Known related guidance from this project's system prompt:
- `git status -uall` (equivalent to `-u all` / `-u`) is explicitly forbidden — can hang/OOM on repos with large untracked trees.

Other `-u` flags exist (`git push -u`, `git stash -u`, `git clean -u`) — any of them could have been the culprit.

**Why:** User flagged it as a recurring concern worth remembering, even though specifics are gone.

**How to apply:** Before adding `-u` (or `-uall`) to any git invocation, pause and justify it. Default to plain `git status`. For `git push`, only use `-u` to set upstream on a new branch's first push.
