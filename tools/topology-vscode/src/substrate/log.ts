// Forward substrate probe logs to the extension host so they land in
// .probe/substrate-log.jsonl and an external watcher (CLI, AI agent)
// can tail them without devtools access. Mirrors the existing
// pulse-probe-dump pattern. Step 6 deletes this with the rest of the
// probe machinery.

export function slog(label: string, data?: Record<string, unknown>): void {
  const entry = JSON.stringify({
    ts: Date.now(),
    label,
    data: data ?? {},
  });
  console.log(`[substrate] ${label}`, data ?? {});
  // Lazy webview import: in test/node envs `window` is undefined and
  // pulling in webview/save would throw at module load.
  if (typeof window === "undefined") return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { vscode } = require("../webview/save") as typeof import("../webview/save");
    vscode.postMessage({ type: "substrate-log", entry });
  } catch {
    // Harness / test env: console.log above is enough.
  }
}
