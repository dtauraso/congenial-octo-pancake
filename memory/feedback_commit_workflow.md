---
name: feedback_commit_workflow
description: User prefers test-then-commit workflow with push to branch after each change
type: feedback
---

The user wants a consistent workflow: make the change, build, run, verify output matches previous run, then commit and push to branch. Each improvement gets its own commit. When asked to "commit and push to branch" just do it without re-reading files or asking questions.

**Why:** Clean git history with one logical change per commit.

**How to apply:** After any code change, always build and run before committing. Compare output to previous run. Commit with descriptive message. Push to the current feature branch.
