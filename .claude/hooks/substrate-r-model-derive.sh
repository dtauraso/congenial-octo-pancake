#!/usr/bin/env bash
# PreToolUse hook: fires on Edit/Write/MultiEdit and Bash.
# If the target file (or Bash command) touches substrate-r/, emit the model-derive reminder and exit 2.

SUBSTRATE_PATH='tools/topology-vscode/src/webview/substrate-r/'
LOG_FILE="$(dirname "$0")/substrate-r-blocks.log"

input=$(cat)

tool_name=$(printf '%s' "$input" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(data.get('tool_name', ''))
" 2>/dev/null)

log_block() {
  local excerpt
  excerpt=$(printf '%s' "$1" | head -c 200)
  printf '%s\t%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$tool_name" "$excerpt" >> "$LOG_FILE" || true
}

block() {
  log_block "$1"
  cat >&2 <<'EOF'
Substrate-r edit detected. Before patching this file:
1. State in one line the local rule this body/primitive implements per MODEL.md.
2. Compare to the current code. If they don't match, the model-misalignment is the bug — fix that first, then your change.
3. Do not add internal state (queues, restart machines, exhaustion phases) to bodies. Bodies are local rules over slots and wires.
EOF
  exit 2
}

case "$tool_name" in
  Edit|Write|MultiEdit)
    file_path=$(printf '%s' "$input" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(data.get('tool_input', {}).get('file_path', ''))
" 2>/dev/null)
    if printf '%s' "$file_path" | grep -q "$SUBSTRATE_PATH"; then
      block "$file_path"
    fi
    ;;

  Bash)
    command=$(printf '%s' "$input" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(data.get('tool_input', {}).get('command', ''))
" 2>/dev/null)

    # Only check commands that reference the substrate-r path at all
    if printf '%s' "$command" | grep -q "$SUBSTRATE_PATH"; then
      # Match write verbs (broad — favor false positives over missed bypasses)
      if printf '%s' "$command" | grep -qE \
        '(>[^&]|>>|sed[[:space:]]+-i|tee[[:space:]]+|cp[[:space:]]+|mv[[:space:]]+|node[[:space:]]+-e)'; then
        block "$(printf '%s' "$command" | head -c 200)"
      fi
    fi
    ;;
esac

exit 0
