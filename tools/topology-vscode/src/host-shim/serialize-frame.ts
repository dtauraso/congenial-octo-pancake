// Step 7a: serialize a host-shim PacedFrame into a postMessage-safe
// FrameMsg. Maps are flattened to arrays of pairs so the structured-
// clone boundary between extension host and webview stays JSON-shaped
// (Map round-trips fine across postMessage in practice, but we keep
// the wire format JSON-shaped so trace dumps and snapshot fixtures
// stringify cleanly without per-call replacers). Carried values are
// passed through as `unknown` — the caller is responsible for using
// values that are themselves structured-cloneable.

import type { PacedFrame } from "./host-shim";
import type { FrameMsg } from "../messages";

export function serializeFrame<V>(frame: PacedFrame<V>): FrameMsg {
  return {
    type: "frame",
    seq: frame.seq,
    wires: Array.from(frame.wires.entries()),
    nodes: Array.from(frame.nodes.entries()),
  };
}
