import { useReactFlow } from "reactflow";

type Guides = { vx: number | null; hy: number | null };

// Renders the vertical/horizontal alignment guides during a node drag.
// Guide coordinates are flow-space; we apply the live RF viewport
// transform here so the lines sit on screen even while panning/zooming.
export function AlignGuides({ guides }: { guides: Guides }) {
  const rf = useReactFlow();
  if (guides.vx === null && guides.hy === null) return null;
  const vp = rf.getViewport();
  return (
    <>
      {guides.vx !== null && (
        <div
          className="align-guide align-guide-v"
          style={{ left: guides.vx * vp.zoom + vp.x }}
        />
      )}
      {guides.hy !== null && (
        <div
          className="align-guide align-guide-h"
          style={{ top: guides.hy * vp.zoom + vp.y }}
        />
      )}
    </>
  );
}
