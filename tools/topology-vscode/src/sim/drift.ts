// Phase 7 Chunk 2 — drift detection.
//
// Drift = first index where two TraceEvent sequences disagree under
// the projection (kind, node|edge, port?, value?). Step/tick/cycle
// excluded by design — those are recorder-assigned, not behavioral.
//
// Used by the side-by-side UI to highlight where the simulator and a
// loaded trace diverge. The simulator side is built by lowering its
// own `world.history` via historyToTrace (Chunk 1); the trace side is
// the parsed file. Same projection on both sides keeps the comparison
// honest.

import type { TraceEvent } from "./trace";

export type DriftResult =
  | { kind: "match"; length: number }
  | { kind: "diverge"; index: number; expected: TraceEvent; got: TraceEvent }
  | { kind: "length-mismatch"; commonPrefix: number; expectedLen: number; gotLen: number };

// String key uniquely identifying an event under the projection.
// Anything not in this string is *intentionally* outside drift's scope.
function projection(e: TraceEvent): string {
  switch (e.kind) {
    case "recv":
      return `recv:${e.node}/${e.port}=${e.value}`;
    case "fire":
      return `fire:${e.node}`;
    case "send":
      return `send:${e.edge}=${e.value}`;
  }
}

export function detectDrift(
  expected: readonly TraceEvent[],
  got: readonly TraceEvent[],
): DriftResult {
  const n = Math.min(expected.length, got.length);
  for (let i = 0; i < n; i++) {
    if (projection(expected[i]) !== projection(got[i])) {
      return { kind: "diverge", index: i, expected: expected[i], got: got[i] };
    }
  }
  if (expected.length !== got.length) {
    return {
      kind: "length-mismatch",
      commonPrefix: n,
      expectedLen: expected.length,
      gotLen: got.length,
    };
  }
  return { kind: "match", length: n };
}

// Human-readable one-line summary for UI status text.
export function summarizeDrift(d: DriftResult): string {
  switch (d.kind) {
    case "match":
      return `no drift through ${d.length} events`;
    case "diverge":
      return `drift at index ${d.index}: expected ${projection(d.expected)}, got ${projection(d.got)}`;
    case "length-mismatch":
      return `length mismatch: expected ${d.expectedLen}, got ${d.gotLen} (common prefix ${d.commonPrefix})`;
  }
}
