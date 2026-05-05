// Pure decision: given a parsed sidecar camera + current pane size, return
// the single viewport to apply (or "none"). The single-call shape is what
// contracts.md C3 ("view-load triggers exactly one setViewport per message")
// pins — keep this returning at most one viewport so the call site reduces
// to one ctx.rf.setViewport invocation.

import { boxToViewport } from "../camera";
import { isLegacyCamera, type Camera, type LegacyCameraBox } from "../../viewerState";

export type Viewport = { x: number; y: number; zoom: number };

export type ViewportResolution =
  | { kind: "none" }
  | { kind: "direct"; viewport: Viewport }
  | { kind: "migrated"; viewport: Viewport };

export function resolveViewLoadViewport(
  camera: Camera | LegacyCameraBox | undefined,
  paneSize: { width: number; height: number } | null,
): ViewportResolution {
  if (!camera) return { kind: "none" };
  if (!isLegacyCamera(camera)) {
    return { kind: "direct", viewport: { x: camera.x, y: camera.y, zoom: camera.zoom } };
  }
  if (!paneSize) return { kind: "none" };
  const vp = boxToViewport(camera, paneSize.width, paneSize.height);
  return { kind: "migrated", viewport: { x: vp.x, y: vp.y, zoom: vp.zoom } };
}
