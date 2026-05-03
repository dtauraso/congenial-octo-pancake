import { render as litRender, svg } from "lit-html";
import { repeat } from "lit-html/directives/repeat.js";
import { defsTemplate } from "../defs";
import { nodeById, spec, staticRoot } from "../state";
import { renderAnimation, resetAnimations } from "./animation";
import { backgroundTemplate } from "./background";
import { legendTemplate, noteTemplate } from "./chrome";
import { edgeTemplate } from "./edges";
import { nodeTemplate } from "./nodes";
import { registerStateTextsFromDom } from "./state-text";

function renderAll() {
  return svg`
    ${defsTemplate}
    ${backgroundTemplate}
    <g id="edges">${repeat(spec.edges, (e) => e.id, edgeTemplate)}</g>
    <g id="nodes">${repeat(spec.nodes, (n) => n.id, nodeTemplate)}</g>
    <g id="annotations">
      ${spec.notes ? spec.notes.map(noteTemplate) : null}
      ${spec.legend && spec.legend.length ? legendTemplate() : null}
    </g>`;
}

function indexNodes() {
  nodeById.clear();
  for (const n of spec.nodes) nodeById.set(n.id, n);
}

export function render() {
  resetAnimations();
  indexNodes();
  litRender(renderAll(), staticRoot);
  registerStateTextsFromDom();
  if (spec.timing && spec.timing.steps.length) renderAnimation();
}

export function staticRender() {
  litRender(renderAll(), staticRoot);
}
