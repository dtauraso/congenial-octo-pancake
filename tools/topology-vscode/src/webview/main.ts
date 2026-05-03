import { parseSpec } from "../schema";
import { render } from "./render";
import { isSynced, markSynced, postReady, setStatus } from "./save";
import { SVG_NS, setLayers, setSpec } from "./state";
import { applyView, attachZoomPan } from "./view";

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
  }
});

init();
