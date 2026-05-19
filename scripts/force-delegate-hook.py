#!/usr/bin/env python3
"""PreToolUse hook: hard-block executor-style work after a threshold.

Counts Read / Grep / Glob calls plus Bash calls whose command starts
with a search verb (grep, rg, find, ls, cat, head, tail, awk, sed).
Threshold is 2 -- the 3rd qualifying call returns permissionDecision
"deny" with a message instructing the model to spawn an Agent
subagent instead. The Task/Agent tool resets the counter.
"""
import json
import os
import re
import sys

THRESHOLD = 2  # block on the (THRESHOLD+1)th call
SEARCH_VERBS = re.compile(r"^\s*(grep|rg|find|ls|cat|head|tail|awk|sed)\b")

def counter_path(session_id: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9_-]", "_", session_id or "default")
    return f"/tmp/claude-delegate-{safe}.count"

def read_count(path: str) -> int:
    try:
        with open(path) as f:
            return int(f.read().strip() or "0")
    except Exception:
        return 0

def write_count(path: str, n: int) -> None:
    try:
        with open(path, "w") as f:
            f.write(str(n))
    except Exception:
        pass

def main() -> int:
    try:
        data = json.load(sys.stdin)
    except Exception:
        return 0

    tool = data.get("tool_name", "")
    session_id = data.get("session_id", "default")
    path = counter_path(session_id)

    # Reset on subagent spawn.
    if tool in ("Task", "Agent"):
        write_count(path, 0)
        return 0

    is_search = tool in ("Read", "Grep", "Glob")
    if tool == "Bash":
        cmd = (data.get("tool_input") or {}).get("command", "")
        if SEARCH_VERBS.match(cmd):
            is_search = True

    if not is_search:
        return 0

    n = read_count(path) + 1
    write_count(path, n)

    if n > THRESHOLD:
        msg = (
            f"Delegate this. You've made {n} executor-style lookups inline. "
            "Spawn an Agent subagent: model='haiku' with subagent_type='Explore' "
            "for research, or model='sonnet' general-purpose for mechanical edits. "
            "Counter resets when you spawn the Agent. If you genuinely need one "
            "more inline lookup (e.g. reading a file the user just named), say "
            "so in chat -- the user can clear /tmp/claude-delegate-*.count."
        )
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": msg,
            }
        }))
    return 0

if __name__ == "__main__":
    sys.exit(main())
