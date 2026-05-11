import { createRoot } from "react-dom/client";
import "reactflow/dist/style.css";
import "./webview.css";
import App from "./rf/app";
import { flushSave, flushViewSave, setTopogenStatus } from "./save";
import { parseHostToWebview } from "../messages";
import { getSpec, setDimmed, setRunStatus } from "./state";
import { SubstrateProvider } from "./substrate-r/registry";

// Test-only hook for the Playwright e2e harness. The harness stub of
// acquireVsCodeApi populates window.__wirefold_sent with every postMessage
// call from the webview, so a test can assert both the live spec and that a
// save was posted.
(window as unknown as { __wirefold_test: unknown }).__wirefold_test = {
  getSpec,
  getSent: () =>
    (window as unknown as { __wirefold_sent?: unknown[] }).__wirefold_sent ?? [],
  // Test-only: drive the dim state directly so tests don't need to click
  // the saved-views panel. Pass a string[] of member ids to dim everything
  // *not* in the set; pass undefined to clear.
  applyDim: (members: string[] | undefined) =>
    setDimmed(members ? new Set(members) : null),
};

// Surface any unhandled webview error to the extension host so it
// shows up in `.probe/substrate-log.jsonl` without DevTools.
window.addEventListener("error", (e) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { slog } = require("../substrate/log") as typeof import("../substrate/log");
  slog("webview-error", {
    message: e.message,
    filename: e.filename,
    lineno: e.lineno,
    colno: e.colno,
    stack: (e.error as Error | undefined)?.stack ?? "",
  });
});
// Hijack console.error so React render errors (which go to console.error, not window.onerror) reach our log.
const _origConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { slog } = require("../substrate/log") as typeof import("../substrate/log");
    slog("console-error", { args: args.map((a) => {
      if (a instanceof Error) return { message: a.message, stack: a.stack };
      if (typeof a === "string") return a;
      try { return JSON.stringify(a); } catch { return String(a); }
    }) });
  } catch { /* swallow logging failures */ }
  _origConsoleError(...args);
};
window.addEventListener("unhandledrejection", (e) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { slog } = require("../substrate/log") as typeof import("../substrate/log");
  const reason = e.reason as { message?: string; stack?: string } | undefined;
  slog("webview-unhandled-rejection", {
    message: reason?.message ?? String(e.reason),
    stack: reason?.stack ?? "",
  });
});

const app = document.getElementById("app")!;
try {
  createRoot(app).render(
    <SubstrateProvider>
      <App />
    </SubstrateProvider>,
  );
} catch (err) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { slog } = require("../substrate/log") as typeof import("../substrate/log");
  const e = err as Error;
  slog("webview-render-error", { message: e?.message ?? String(err), stack: e?.stack ?? "" });
  throw err;
}

window.addEventListener("message", (e) => {
  const msg = parseHostToWebview(e.data);
  if (!msg) return;
  if (msg.type === "topogen-status") {
    setTopogenStatus(msg.state === "error"
      ? { state: "error", message: msg.message ?? "" }
      : { state: msg.state });
  } else if (msg.type === "run-status") {
    setRunStatus(msg.state === "error"
      ? { state: "error", message: msg.message ?? "" }
      : { state: msg.state });
  } else if (msg.type === "flush") {
    // Host requests immediate flush of any pending debounced saves (panel
    // becoming hidden / about to dispose).
    flushSave();
    flushViewSave();
  }
  // view-load is fully handled inside App's message effect now that the
  // panels read their state from the zustand store directly.
});
