// Camera conversions between SVG-viewBox shape (legacy lit-html renderer)
// and React Flow's pan/zoom Viewport. Pulled out of app.tsx so unit tests
// can lock in the legacy → RF migration math.

import type { Viewport } from "reactflow";

export type ViewBox = { x: number; y: number; w: number; h: number };

export function viewportToBox(vp: Viewport, W: number, H: number): ViewBox {
  const z = vp.zoom || 1;
  return { x: -vp.x / z, y: -vp.y / z, w: W / z, h: H / z };
}

export function boxToViewport(vb: ViewBox, W: number, H: number): Viewport {
  const zoom = Math.min(W / vb.w, H / vb.h);
  const cx = vb.x + vb.w / 2;
  const cy = vb.y + vb.h / 2;
  return { x: W / 2 - cx * zoom, y: H / 2 - cy * zoom, zoom };
}
