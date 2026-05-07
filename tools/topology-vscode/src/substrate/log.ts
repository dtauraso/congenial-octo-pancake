// Forward substrate probe logs to the extension host so they land in
// .probe/substrate-log.jsonl and an external watcher (CLI, AI agent)
// can tail them without devtools access. Mirrors the existing
// pulse-probe-dump pattern. Step 6 deletes this with the rest of the
// probe machinery.

import { vscode } from "../webview/save";

export function slog(label: string, data?: Record<string, unknown>): void {
  const entry = JSON.stringify({
    ts: Date.now(),
    label,
    data: data ?? {},
  });
  console.log(`[substrate] ${label}`, data ?? {});
  try {
    vscode.postMessage({ type: "substrate-log", entry });
  } catch {
    // Harness / test env: vscode shim may not exist; console.log above
    // is enough for those.
  }
}
