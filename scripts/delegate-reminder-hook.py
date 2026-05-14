#!/usr/bin/env python3
"""UserPromptSubmit hook: nudge main session to delegate executor-style work.

Fires only when the prompt contains keywords that suggest multi-step
lookup / mechanical edit work (the kind that should go to a haiku or
sonnet subagent per CLAUDE.md "Model routing").
"""
import json
import re
import sys

PATTERN = re.compile(
    r"\b(audit|sweep|refactor|rename|grep|scan)\b|find all|search the|check all|go through",
    re.IGNORECASE,
)

MESSAGE = (
    "Heads up: this prompt looks like executor-style work. Per CLAUDE.md "
    "\"Model routing\", delegate multi-step lookups to an Explore subagent "
    "with model: \"haiku\", and scoped mechanical edits to a general-purpose "
    "subagent with model: \"sonnet\", rather than grinding inline on Opus."
)

try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)

prompt = data.get("prompt", "")
if PATTERN.search(prompt):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "UserPromptSubmit",
            "additionalContext": MESSAGE,
        }
    }))
