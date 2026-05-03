import type { EdgeKind } from "../../schema";

// Dashed strokes by kind, per docs/svg-style-guide.md §5. `pointer`
// indicates a Go struct reference captured at construction time, not a
// runtime channel send.
export function dashForKind(kind: EdgeKind | undefined): string | undefined {
  if (kind === "pointer") return "4 3";
  return undefined;
}
