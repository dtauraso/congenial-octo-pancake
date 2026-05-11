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
  // Read the vscode api off the window global that webview/save's top-level
  // init caches there. Avoids a static import of webview/save (which touches
  // `document` at module load and breaks in node) and avoids `require` (which
  // doesn't bundle cleanly when substrate runs inside the webview).
  if (typeof window === "undefined") return;
  const api = (window as unknown as {
    __vscodeApi?: { postMessage(msg: unknown): void };
  }).__vscodeApi;
  api?.postMessage({ type: "substrate-log", entry });
}
