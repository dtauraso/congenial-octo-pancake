// Transport for the webview's structured log channel. Posts one JSON
// entry to the extension host, which appends it to
// .probe/webview-log.jsonl. Replaces the slog() side-channel from the
// pre-collapse substrate.
//
// Failure is swallowed: a logging path that throws would mask the real
// error it was trying to report.

export function postLog(label: string, data?: Record<string, unknown>): void {
  const entry = JSON.stringify({ ts: Date.now(), label, data: data ?? {} });
  console.log(`[wirefold] ${label}`, data ?? {});
  if (typeof window === "undefined") return;
  try {
    const api = (window as unknown as {
      __vscodeApi?: { postMessage(msg: unknown): void };
    }).__vscodeApi;
    api?.postMessage({ type: "webview-log", entry });
  } catch {
    /* swallow */
  }
}
