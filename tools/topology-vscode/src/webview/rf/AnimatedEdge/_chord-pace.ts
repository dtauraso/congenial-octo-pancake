// Chord-paced traversal: total pulse duration is set by the straight-
// line endpoint distance (chord), not by SVG arc length. Different
// edge routes (line/bezier, snake, below) have wildly different
// arc-to-chord ratios, so arc-paced timing made curvy edges visually
// crawl while straight edges flew. Pacing on chord makes on-screen
// rate uniform regardless of route shape; the dot still traces the
// real arc, just on a chord-derived clock.
//
// remainingArc/svgArc is the unfinished fraction of the path arc;
// scaling chordTotal by that gives the remainder honored on re-runs
// (node drag preserves arcTraveledRef → startArc → remainingArc).
//
// Contract C10: see test/contracts/pulse-uniform-speed.test.ts.

export function chordTraversalMs(
  chordPx: number,
  speedPxPerMs: number,
  svgArc: number,
  remainingArc: number,
): number {
  if (svgArc <= 0 || speedPxPerMs <= 0) return 0;
  const totalMs = chordPx / speedPxPerMs;
  return totalMs * (remainingArc / svgArc);
}
