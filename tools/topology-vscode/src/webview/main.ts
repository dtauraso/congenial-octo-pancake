import { parseSpec } from "../schema";
import { render } from "./render";
import {
  isSynced,
  markSynced,
  markViewSynced,
  postReady,
  setStatus,
  setTopogenStatus,
  type TopogenStatus,
} from "./save";
import { SVG_NS, setLayers, setSpec, setViewerState } from "./state";
import { applyCameraFromViewerState, applyView, attachZoomPan } from "./view";
import { parseViewerState, serializeViewerState } from "./viewerState";
import { initRunButton, setRunStatus, type RunStatus } from "./run";
import { initTimelinePanel, refreshTimelinePanel } from "./timeline";
import { attachClearOnPan, initViewsPanel, refreshViewsPanel } from "./views";

const app = document.getElementById("app")!;

function init() {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");

  const staticRoot = document.createElementNS(SVG_NS, "g");
  staticRoot.setAttribute("id", "static-root");
  const animationLayer = document.createElementNS(SVG_NS, "g");
  animationLayer.setAttribute("id", "animation");
  animationLayer.setAttribute("pointer-events", "none");

  setLayers({ svg, staticRoot, animationLayer });

  applyView();
  svg.appendChild(staticRoot);
  svg.appendChild(animationLayer);
  app.appendChild(svg);
  attachZoomPan();
  initViewsPanel();
  initTimelinePanel();
  initRunButton();
  attachClearOnPan();
  postReady();
}

window.addEventListener("message", (e) => {
  const msg = e.data;
  if (msg.type === "load") {
    if (isSynced(msg.text)) return;
    try {
      const next = parseSpec(JSON.parse(msg.text));
      setSpec(next);
      markSynced(msg.text);
      render();
      setStatus(false);
    } catch (err) {
      console.error("invalid topology.json", err);
    }
  } else if (msg.type === "view-load") {
    const next = parseViewerState(msg.text);
    setViewerState(next);
    markViewSynced(msg.text ?? serializeViewerState(next));
    applyCameraFromViewerState();
    refreshViewsPanel();
    refreshTimelinePanel();
  } else if (msg.type === "topogen-status") {
    const { type: _t, ...rest } = msg;
    setTopogenStatus(rest as TopogenStatus);
  } else if (msg.type === "run-status") {
    const { type: _t, ...rest } = msg;
    setRunStatus(rest as RunStatus);
  }
});

init();
