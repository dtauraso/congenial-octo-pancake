import { createRoot } from "react-dom/client";
import "reactflow/dist/style.css";
import "./webview.css";
import App from "./rf/app";
import { setTopogenStatus, type TopogenStatus } from "./save";
import { initRunButton, setRunStatus, type RunStatus } from "./run";
import { initTimelinePanel, refreshTimelinePanel } from "./timeline";
import { attachClearOnPan, initViewsPanel, refreshViewsPanel } from "./views";
import { getSpec } from "./state";

// Test-only hook for the Playwright e2e harness. The harness stub of
// acquireVsCodeApi populates window.__wirefold_sent with every postMessage
// call from the webview, so a test can assert both the live spec and that a
// save was posted.
(window as unknown as { __wirefold_test: unknown }).__wirefold_test = {
  getSpec,
  getSent: () =>
    (window as unknown as { __wirefold_sent?: unknown[] }).__wirefold_sent ?? [],
};

const app = document.getElementById("app")!;
createRoot(app).render(<App />);

initRunButton();
initViewsPanel();
initTimelinePanel();
attachClearOnPan();

window.addEventListener("message", (e) => {
  const msg = e.data;
  if (msg.type === "topogen-status") {
    const { type: _t, ...rest } = msg;
    setTopogenStatus(rest as TopogenStatus);
  } else if (msg.type === "run-status") {
    const { type: _t, ...rest } = msg;
    setRunStatus(rest as RunStatus);
  } else if (msg.type === "view-load") {
    // App handles the camera; we refresh the panels that depend on the sidecar.
    queueMicrotask(() => {
      refreshViewsPanel();
      refreshTimelinePanel();
    });
  }
});
