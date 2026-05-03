import { scheduleViewSave } from "./save";
import { svg, view, viewerState } from "./state";

export function applyView() {
  svg.setAttribute("viewBox", `${view.x} ${view.y} ${view.w} ${view.h}`);
}

export function applyCameraFromViewerState() {
  const c = viewerState.camera;
  if (!c) return;
  view.x = c.x; view.y = c.y; view.w = c.w; view.h = c.h;
  applyView();
}

export function clientToSvg(cx: number, cy: number) {
  const pt = svg.createSVGPoint();
  pt.x = cx; pt.y = cy;
  return pt.matrixTransform(svg.getScreenCTM()!.inverse());
}

export function attachZoomPan() {
  svg.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    const factor = Math.exp(ev.deltaY * 0.012);
    const clamped = Math.min(Math.max(view.w * factor, 100), 20000);
    const scale = clamped / view.w;
    const pt = clientToSvg(ev.clientX, ev.clientY);
    view.x = pt.x - (pt.x - view.x) * scale;
    view.y = pt.y - (pt.y - view.y) * scale;
    view.w *= scale;
    view.h *= scale;
    applyView();
    scheduleViewSave();
  }, { passive: false });

  let panning = false;
  let panStart = { x: 0, y: 0 };
  let panOrigin = { x: 0, y: 0 };
  svg.addEventListener("pointerdown", (ev) => {
    if (ev.target !== svg) return;
    panning = true;
    svg.setPointerCapture(ev.pointerId);
    panStart = { x: ev.clientX, y: ev.clientY };
    panOrigin = { x: view.x, y: view.y };
  });
  svg.addEventListener("pointermove", (ev) => {
    if (!panning) return;
    const ctm = svg.getScreenCTM()!;
    const dx = (ev.clientX - panStart.x) / ctm.a;
    const dy = (ev.clientY - panStart.y) / ctm.d;
    view.x = panOrigin.x - dx;
    view.y = panOrigin.y - dy;
    applyView();
  });
  const endPan = (ev: PointerEvent) => {
    if (!panning) return;
    panning = false;
    svg.releasePointerCapture(ev.pointerId);
    scheduleViewSave();
  };
  svg.addEventListener("pointerup", endPan);
  svg.addEventListener("pointercancel", endPan);
}
