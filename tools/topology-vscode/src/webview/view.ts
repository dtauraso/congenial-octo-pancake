import { applyViewBox, currentViewBox, type ViewBox } from "./rf/bridge";
import { getView, setView } from "./state";

export function applyView() {
  const v = getView();
  applyViewBox({ x: v.x, y: v.y, w: v.w, h: v.h });
}

export function syncViewFromRenderer() {
  const vb: ViewBox = currentViewBox();
  setView({ x: vb.x, y: vb.y, w: vb.w, h: vb.h });
}
