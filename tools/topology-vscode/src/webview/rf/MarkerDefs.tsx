import { KIND_COLORS, type EdgeKind } from "../../schema";

// Global SVG <defs> with arrow markers. Marker URL refs resolve by id
// across SVG roots in the same document, so a single hidden host SVG
// is enough — RF edges in their own SVG can still reference these.
//
// Geometry per docs/svg-style-guide.md §9:
//   filled: M0,0 L8,3 L0,6, 8x6 viewBox, refX=8 refY=3
//   open:   M0,0 L10,4 L0,8, 10x8 viewBox, refX=10 refY=4, fill=none
//
// Filled markers are emitted per kind (one per color); the open variant
// is emitted once for each kind that uses arrowStyle="open" (today only
// edge-connection in the cascade reference, but generated for every
// kind for symmetry).

const KINDS = Object.keys(KIND_COLORS) as EdgeKind[];

export function markerEndUrl(
  kind: EdgeKind,
  arrowStyle: "filled" | "open" | undefined,
  size?: "sm" | "md",
): string {
  const variant = arrowStyle === "open" ? "open" : "filled";
  const suffix = size === "sm" ? `-sm` : "";
  return `url(#wf-arrow-${variant}${suffix}-${kind})`;
}

export function MarkerDefs() {
  return (
    <svg
      width={0}
      height={0}
      style={{ position: "absolute", pointerEvents: "none" }}
      aria-hidden
    >
      <defs>
        {KINDS.map((k) => (
          <marker
            key={`f-${k}`}
            id={`wf-arrow-filled-${k}`}
            viewBox="0 0 8 6"
            markerWidth={8}
            markerHeight={6}
            refX={8}
            refY={3}
            orient="auto-start-reverse"
          >
            <path d="M0,0 L8,3 L0,6 Z" fill={KIND_COLORS[k]} />
          </marker>
        ))}
        {KINDS.map((k) => (
          <marker
            key={`o-${k}`}
            id={`wf-arrow-open-${k}`}
            viewBox="0 0 10 8"
            markerWidth={10}
            markerHeight={8}
            refX={10}
            refY={4}
            orient="auto-start-reverse"
          >
            <path
              d="M0,0 L10,4 L0,8"
              fill="none"
              stroke={KIND_COLORS[k]}
              strokeWidth={1.2}
            />
          </marker>
        ))}
        {KINDS.map((k) => (
          <marker
            key={`fsm-${k}`}
            id={`wf-arrow-filled-sm-${k}`}
            viewBox="0 0 5 4"
            markerWidth={5}
            markerHeight={4}
            refX={5}
            refY={2}
            orient="auto-start-reverse"
          >
            <path d="M0,0 L5,2 L0,4 Z" fill={KIND_COLORS[k]} />
          </marker>
        ))}
        {KINDS.map((k) => (
          <marker
            key={`osm-${k}`}
            id={`wf-arrow-open-sm-${k}`}
            viewBox="0 0 6 5"
            markerWidth={6}
            markerHeight={5}
            refX={6}
            refY={2.5}
            orient="auto-start-reverse"
          >
            <path
              d="M0,0 L6,2.5 L0,5"
              fill="none"
              stroke={KIND_COLORS[k]}
              strokeWidth={1.2}
            />
          </marker>
        ))}
      </defs>
    </svg>
  );
}
