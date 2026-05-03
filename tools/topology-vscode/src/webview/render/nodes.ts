import { svg } from "lit-html";
import { NODE_TYPES, type Node } from "../../schema";
import { scheduleSave } from "../save";
import { clientToSvg } from "../view";
import { staticRender } from "./index";

export function nodeTemplate(n: Node) {
  const def = NODE_TYPES[n.type] ?? NODE_TYPES.Generic;
  const isInput = def.role === "input";
  const titleFill = isInput ? "#333" : def.stroke;
  const subFill = def.role === "inhibitor" ? "#bf360c" : isInput ? "#555" : def.stroke;
  const fields = n.state ? Object.keys(n.state) : [];
  const rx = def.shape === "pill" ? 20 : 6;
  const cx = def.width / 2;

  return svg`
    <g class="node" data-id=${n.id} transform=${`translate(${n.x},${n.y})`}
       @pointerdown=${(ev: PointerEvent) => onDown(ev, n)}
       @pointermove=${(ev: PointerEvent) => onMove(ev, n)}
       @pointerup=${onEnd}
       @pointercancel=${onEnd}>
      <rect width=${def.width} height=${def.height} rx=${rx}
            fill=${def.fill} stroke=${def.stroke} stroke-width="2"/>
      <text x=${cx} y="20" text-anchor="middle" font-size="12" font-weight="100" fill=${titleFill} stroke="none">${n.id}</text>
      <text x=${cx} y="36" text-anchor="middle" font-size="11" font-weight="100" fill=${subFill} stroke="none">${n.sublabel ?? n.type}</text>
      ${n.value ? svg`
      <text x=${cx} y="50" text-anchor="middle" font-size="11" font-weight="100" fill=${subFill} stroke="none">${n.value}</text>` : null}
      ${fields.map((field) => svg`
      <text x=${cx} y="52" text-anchor="middle" font-size="13" font-weight="600" fill=${subFill} stroke="none"
            data-state-field=${field} data-node-id=${n.id}>${field}=${n.state![field]}</text>`)}
    </g>`;
}

const drag = {
  node: null as Node | null,
  startX: 0,
  startY: 0,
  originX: 0,
  originY: 0,
  captureEl: null as Element | null,
  pointerId: -1,
};

function onDown(ev: PointerEvent, n: Node) {
  ev.preventDefault();
  ev.stopPropagation();
  const target = ev.currentTarget as Element;
  target.setPointerCapture(ev.pointerId);
  target.classList.add("dragging");
  const pt = clientToSvg(ev.clientX, ev.clientY);
  drag.node = n;
  drag.startX = pt.x;
  drag.startY = pt.y;
  drag.originX = n.x;
  drag.originY = n.y;
  drag.captureEl = target;
  drag.pointerId = ev.pointerId;
}

function onMove(ev: PointerEvent, n: Node) {
  if (drag.node !== n) return;
  const pt = clientToSvg(ev.clientX, ev.clientY);
  n.x = Math.round(drag.originX + (pt.x - drag.startX));
  n.y = Math.round(drag.originY + (pt.y - drag.startY));
  staticRender();
}

function onEnd(ev: PointerEvent) {
  if (!drag.node) return;
  const el = drag.captureEl;
  if (el) {
    try { el.releasePointerCapture(ev.pointerId); } catch { /* already released */ }
    el.classList.remove("dragging");
  }
  drag.node = null;
  drag.captureEl = null;
  drag.pointerId = -1;
  scheduleSave();
}
