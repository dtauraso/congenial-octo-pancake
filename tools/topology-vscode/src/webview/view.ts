import { applyViewBox, currentViewBox, type ViewBox } from "./rf/bridge";
import { view } from "./state";

export function applyView() {
  applyViewBox({ x: view.x, y: view.y, w: view.w, h: view.h });
}

export function syncViewFromRenderer() {
  const vb: ViewBox = currentViewBox();
  view.x = vb.x; view.y = vb.y; view.w = vb.w; view.h = vb.h;
}
