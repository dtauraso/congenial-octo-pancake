#!/usr/bin/env bash
# PreToolUse hook: fires on Edit/Write/MultiEdit.
# If the target file is under substrate-r/, emit the model-derive reminder and exit 2.

input=$(cat)

file_path=$(printf '%s' "$input" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(data.get('tool_input', {}).get('file_path', ''))
" 2>/dev/null)

if printf '%s' "$file_path" | grep -q 'tools/topology-vscode/src/webview/substrate-r/'; then
  cat >&2 <<'EOF'
Substrate-r edit detected. Before patching this file:
1. State in one line the local rule this body/primitive implements per MODEL.md.
2. Compare to the current code. If they don't match, the model-misalignment is the bug — fix that first, then your change.
3. Do not add internal state (queues, restart machines, exhaustion phases) to bodies. Bodies are local rules over slots and wires.
EOF
  exit 2
fi

exit 0
