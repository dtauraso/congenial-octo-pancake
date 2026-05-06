// Shared discriminated unions for webview ↔ extension-host messaging.
// Both sides import from here so unknown / malformed messages are caught
// at type-narrow time rather than silently writing `[object Object]` to disk.

export type TopogenStatus =
  | { state: "running" }
  | { state: "ok" }
  | { state: "error"; message: string };

export type RunStatus =
  | { state: "running" }
  | { state: "ok" }
  | { state: "error"; message: string }
  | { state: "cancelled" };

export type CompareSource = "head" | "file";

export type WebviewToHostMsg =
  | { type: "ready" }
  | { type: "save"; text: string }
  | { type: "view-save"; text: string }
  | { type: "run"; text?: string }
  | { type: "run-cancel" }
  | { type: "compare-head" }
  | { type: "compare-file" }
  | { type: "trace-load" }
  | { type: "trace-clear" }
  | { type: "pulse-probe-dump"; json: string }
  | { type: "stuck-pulse-dump"; json: string }
  | { type: "fold-halo-dump"; json: string }
  | { type: "runner-errors-dump"; json: string }
  | { type: "timeline-dump"; json: string };

export type HostToWebviewMsg =
  | { type: "load"; text: string }
  | { type: "view-load"; text?: string }
  | { type: "topogen-status"; state: TopogenStatus["state"]; message?: string }
  | { type: "run-status"; state: RunStatus["state"]; message?: string }
  | { type: "flush" }
  | { type: "save-error"; message: string }
  | { type: "compare-load"; source: CompareSource; text: string; label: string }
  | { type: "compare-error"; source: CompareSource; message: string }
  | { type: "trace-loaded"; text: string; label: string }
  | { type: "trace-error"; message: string };

export const WEBVIEW_TO_HOST_TYPES: ReadonlySet<WebviewToHostMsg["type"]> = new Set([
  "ready", "save", "view-save", "run", "run-cancel", "compare-head", "compare-file",
  "trace-load", "trace-clear", "pulse-probe-dump", "stuck-pulse-dump", "fold-halo-dump", "runner-errors-dump", "timeline-dump",
]);

export const HOST_TO_WEBVIEW_TYPES: ReadonlySet<HostToWebviewMsg["type"]> = new Set([
  "load", "view-load", "topogen-status", "run-status", "flush", "save-error",
  "compare-load", "compare-error", "trace-loaded", "trace-error",
]);

export function parseWebviewToHost(raw: unknown): WebviewToHostMsg | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const t = (raw as { type?: unknown }).type;
  if (typeof t !== "string" || !WEBVIEW_TO_HOST_TYPES.has(t as WebviewToHostMsg["type"])) {
    return undefined;
  }
  // Per-variant field checks. Keep minimal; we trust our own sender, but
  // reject anything that would round-trip a non-string payload to disk.
  const m = raw as Record<string, unknown>;
  switch (t) {
    case "save":
    case "view-save":
      return typeof m.text === "string" ? (m as unknown as WebviewToHostMsg) : undefined;
    case "run":
      // text is optional; reject only if present-but-not-a-string
      return m.text === undefined || typeof m.text === "string"
        ? (m as unknown as WebviewToHostMsg)
        : undefined;
    case "pulse-probe-dump":
    case "stuck-pulse-dump":
    case "fold-halo-dump":
    case "runner-errors-dump":
      return typeof m.json === "string" ? (m as unknown as WebviewToHostMsg) : undefined;
    default:
      return m as unknown as WebviewToHostMsg;
  }
}

export function parseHostToWebview(raw: unknown): HostToWebviewMsg | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const t = (raw as { type?: unknown }).type;
  if (typeof t !== "string" || !HOST_TO_WEBVIEW_TYPES.has(t as HostToWebviewMsg["type"])) {
    return undefined;
  }
  return raw as HostToWebviewMsg;
}
