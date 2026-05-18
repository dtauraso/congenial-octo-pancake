---
name: feedback-hook-block-means-stop
metadata: 
  node_type: memory
  type: feedback
  originSessionId: ba4bb05f-138d-4a9d-bedd-eca6a7346249
---

When a PreToolUse hook returns `exit 2`, the correct response is **stop and report to the user** — not find an alternative tool that avoids the hook.

Concretely: if `Edit` on a substrate-r file is blocked, do not:
- switch to `Bash` and write with `python3 -c`, `sed -i`, `tee`, or shell redirect
- use `node -e`, `cp`, `mv`, or any other write path to the same file
- construct multi-step workarounds that land the same bytes by a different route

The hook is a discipline gate. Bypassing it defeats the point. The block message tells you what to do instead (derive the model rule, compare to current code, fix misalignment first).

Canonical example: `.claude/hooks/substrate-r-model-derive.sh` guards `tools/topology-vscode/src/webview/substrate-r/`. It fires on `Edit|Write|MultiEdit` and on `Bash` commands that contain the substrate-r path plus a write verb. Both paths are intentional — a subagent previously bypassed the Edit guard by invoking `python3` from Bash.
