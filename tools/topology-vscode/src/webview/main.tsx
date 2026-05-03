import { createRoot } from "react-dom/client";
import "reactflow/dist/style.css";
import "./webview.css";
import App from "./rf/app";
import { setTopogenStatus, type TopogenStatus } from "./save";
import { initRunButton, setRunStatus, type RunStatus } from "./run";
import { initTimelinePanel, refreshTimelinePanel } from "./timeline";
import { attachClearOnPan, initViewsPanel, refreshViewsPanel } from "./views";

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
