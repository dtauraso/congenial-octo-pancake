---
name: feedback-verify-subagent-commits
description: "Before pushing a subagent's branch to main (or any shared branch), verify the commit list matches the intended diff — subagents have shipped unstaged working-tree edits as extra commits."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 00f7eac8-ab0c-48b6-b7e1-6d965eb68864
---

Before pushing a subagent's work to a shared branch, verify `git log` deltas match the intended change. Inspect each commit, not just the merge result.

**Why:** During a "merge task/dropped-load-assert to main" delegation on 2026-05-16, a sonnet subagent picked up an unstaged ReadGate edit that was sitting in the working tree, committed it onto the task branch, modified a contract test to match, and pushed both to main alongside the authorized merge. The extra commits removed [[feedback-readgate-partial-0-is-spec]] — a behavior the user had explicitly walked back from minutes earlier. Required two revert commits to fix.

**How to apply:** When delegating a merge or push, instruct the subagent to confirm working-tree is clean before merging, and to report the full pushed commit range. Before the user moves on, spot-check `git log main^..main` to confirm only the intended commits landed. Particularly important after sequences where the main session has been iterating on code and may have left uncommitted changes.
