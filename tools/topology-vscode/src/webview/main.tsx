import { createRoot } from "react-dom/client";
import "reactflow/dist/style.css";
import "./webview.css";
import App from "./rf/app";
// Eagerly install fold-halo probe globals (window.__foldHaloDump etc.) so
// they exist on every webview load even before a fold is rendered, and a
// fresh `.probe/fold-halo-last.json` is written by the heartbeat. Mirrors
// the pulse-probe lifecycle (loaded transitively via AnimatedEdge).
import "./rf/fold-halo-probe";
import { installPulseLifetimes } from "../sim/runner/pulse-lifetimes";

// Pulse lifetimes are owned by the runner layer, not by PulseInstance.
// Install at webview boot so every emit registers a lifecycle even when
// the rendering view layer (AnimatedEdge / fold-halo / future modes)
// doesn't mount a component for that edge. See contract C6.
installPulseLifetimes();
import { flushSave, flushViewSave, setTopogenStatus } from "./save";
import { parseHostToWebview } from "../messages";
import { handleTraceLoaded, handleTraceError } from "./panels/TimelinePanel";
import { getSpec, setDimmed, setRunStatus } from "./state";

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

const app = document.getElementById("app")!;
createRoot(app).render(<App />);

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
  } else if (msg.type === "trace-loaded") {
    handleTraceLoaded(msg.text, msg.label);
  } else if (msg.type === "trace-error") {
    handleTraceError(msg.message);
  }
  // view-load is fully handled inside App's message effect now that the
  // panels read their state from the zustand store directly.
});
