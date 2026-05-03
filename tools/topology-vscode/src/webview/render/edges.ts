import { svg } from "lit-html";
import { KIND_COLORS, type Edge } from "../../schema";
import { markerForEdge } from "../defs";
import { edgeGeom, labelAnchor } from "../geom";

export function edgeTemplate(e: Edge) {
  const g = edgeGeom(e);
  if (!g) return null;
  const stroke = KIND_COLORS[e.kind] ?? "#888";
  const marker = `url(#${markerForEdge(e)})`;
  const primitive = g.kind === "line"
    ? svg`<line x1=${g.x1} y1=${g.y1} x2=${g.x2} y2=${g.y2}
                stroke=${stroke} stroke-width="1.5" marker-end=${marker}/>`
    : svg`<path d=${g.d} fill="none" stroke=${stroke} stroke-width="1.5" marker-end=${marker}/>`;

  let labelTpl = null;
  if (e.label) {
    const mid = labelAnchor(g);
    const labelText = e.kind === "feedback-ack" ? `↻ ${e.label}` : e.label;
    const labelFill = e.kind === "feedback-ack" ? stroke : "#111";
    const labelWeight = e.kind === "feedback-ack" ? "600" : "300";
    labelTpl = svg`<text x=${mid.x} y=${mid.y - 6} text-anchor="middle" font-size="12"
                         font-weight=${labelWeight} fill=${labelFill} stroke="none">${labelText}</text>`;
  }

  return svg`<g data-edge-id=${e.id} class=${`edge ${e.kind}`}>${primitive}${labelTpl}</g>`;
}
