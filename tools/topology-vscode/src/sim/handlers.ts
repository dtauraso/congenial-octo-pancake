// Seed handlers for the Phase 5.5 simulator. Each handler is a pure
// `(state, input, props) → (state', emissions)` function, registered per
// NODE_TYPES entry per input port. Handlers are the only authority for
// what a node does when a pulse arrives; the simulator runs them in
// dependency order to drive animation.
//
// Grounded against the Go implementations in $repo/<NodeName>/*.go —
// keep this file and the Go nodes consistent. If a Go node grows new
// behavior, its handler here must mirror it or N1'/N2 will give a
// false picture of the topology.

import type {
  HandlerFn,
  HandlerState,
  HandlerResult,
  StateValue,
} from "../schema";

// Convenience: most join handlers buffer one input and fire when both
// have arrived. `field` is the state slot; `flag` is the has-arrived bit.
function buffer(state: HandlerState, port: string, value: StateValue): HandlerState {
  return { ...state, [port]: value, [`__has_${port}`]: 1 };
}
const has = (state: HandlerState, port: string): boolean =>
  state[`__has_${port}`] === 1;
const clear = (state: HandlerState, ports: string[]): HandlerState => {
  const out = { ...state };
  for (const p of ports) {
    delete out[p];
    delete out[`__has_${p}`];
  }
  return out;
};
const noEmit = (state: HandlerState): HandlerResult => ({ state, emissions: [] });

// ChainInhibitor: `in` arrives → emit held value on inhibitOut, new
// value on readNew, held on out, ack=1, then store new as held. Order
// mirrors ChainInhibitorNode/ChainInhibitorNode.go (ToEdge sends, then
// ToEdgeNew, then ToNext, then ToAck) so trace projection matches.
const chainInhibitorIn: HandlerFn = (state, input) => {
  const held = state.held ?? 0;
  return {
    state: { ...state, held: input.value },
    emissions: [
      { port: "inhibitOut", value: held },
      { port: "readNew", value: input.value },
      { port: "out", value: held },
      { port: "ack", value: 1 },
    ],
  };
};

// ReadGate / SyncGate / AndGate / PatternAnd: AND-style join. Buffer
// one input; when both inputs present, emit the chosen function on the
// output port and clear.
function makeJoin(
  inputs: [string, string],
  outPort: string,
  combine: (a: StateValue, b: StateValue) => StateValue,
): HandlerFn {
  const [pa, pb] = inputs;
  return (state, input) => {
    const next = buffer(state, input.port, input.value);
    if (has(next, pa) && has(next, pb)) {
      const a = next[pa];
      const b = next[pb];
      return {
        state: clear(next, [pa, pb]),
        emissions: [{ port: outPort, value: combine(a, b) }],
      };
    }
    return noEmit(next);
  };
}

const readGateJoin = makeJoin(["chainIn", "ack"], "out", (a) => a);
const syncGateJoin = makeJoin(["a", "b"], "release", () => 1);
const andGateJoin = makeJoin(["a", "b"], "out", (a, b) =>
  Number(a) === 1 && Number(b) === 1 ? 1 : 0,
);
// InhibitRightGate fires only when left=1 and right=0 (mirrors the Go
// node).
const inhibitRightJoin = makeJoin(["left", "right"], "out", (l, r) =>
  Number(l) === 1 && Number(r) === 0 ? 1 : 0,
);

// EdgeNode: XOR contrast detector between adjacent inhibitor values.
// Buffer left/right; on both present emit l^r identically on three
// outputs (current inhibitor, partition, next edge), mirroring the
// three S.Send calls in EdgeNode/EdgeNode.go.
const edgeJoin: HandlerFn = (state, input) => {
  const next = buffer(state, input.port, input.value);
  if (has(next, "left") && has(next, "right")) {
    const xor = Number(next.left) ^ Number(next.right);
    return {
      state: clear(next, ["left", "right"]),
      emissions: [
        { port: "outInhibitor", value: xor },
        { port: "outPartition", value: xor },
        { port: "outNextEdge", value: xor },
      ],
    };
  }
  return noEmit(next);
};

// Latches (ReadLatch, DetectorLatch): buffer `in` until `release`
// arrives, then emit out + ack and clear.
const latchHandlers: Record<string, HandlerFn> = {
  in: (state, input) => noEmit({ ...state, held: input.value, __hasHeld: 1 }),
  release: (state) => {
    if (state.__hasHeld !== 1) return noEmit(state);
    const value = state.held;
    return {
      state: clear(state, ["held", "__hasHeld"]),
      emissions: [
        { port: "out", value },
        { port: "ack", value: 1 },
      ],
    };
  },
};

// StreakBreakDetector: emit done=1 if old and new have *different* signs
// (treating 0 as negative for sign purposes — matches the existing
// signed-edge convention).
const sbdJoin: HandlerFn = (state, input) => {
  const next = buffer(state, input.port, input.value);
  if (has(next, "old") && has(next, "new")) {
    const o = Number(next.old);
    const n = Number(next.new);
    const broke = (o >= 1) !== (n >= 1) ? 1 : 0;
    return {
      state: clear(next, ["old", "new"]),
      emissions: [{ port: "done", value: broke }],
    };
  }
  return noEmit(next);
};

// StreakDetector: emit done=1 always; streak=1 if old and new have
// matching signs.
const sdJoin: HandlerFn = (state, input) => {
  const next = buffer(state, input.port, input.value);
  if (has(next, "old") && has(next, "new")) {
    const o = Number(next.old);
    const n = Number(next.new);
    const same = (o >= 1) === (n >= 1) ? 1 : 0;
    return {
      state: clear(next, ["old", "new"]),
      emissions: [
        { port: "done", value: 1 },
        { port: "streak", value: same },
      ],
    };
  }
  return noEmit(next);
};

// Partition: state machine NotInitialized → Growing → Stopped, advanced
// by value=1 on `in`. Mirrors PartitionNode/PartitionNode.go. Emits on
// `out` only on the Growing transition (continuous Grow emission in the
// Go node is modeled as a single transition pulse here; the simulator
// can re-pulse via concurrent-edge mode in N1').
//
// Phase 6 Chunk A: writes `dx` into state on each transition so the
// renderer can tween a visible slide. Magnitude (props.slidePx, default
// 30) sets pixels per phase advance. The slide is the Partition's
// timing-window endpoint moving along the chain; nothing in `topogen`
// reads dx today, but the rule (motion-bearing state lives on spec) is
// what makes it spec-side rather than viewer-side.
const PARTITION_NOT_INIT = 0;
const PARTITION_GROWING = 1;
const PARTITION_STOPPED = 2;
const partitionIn: HandlerFn = (state, input, props) => {
  const cur = Number(state.phase ?? PARTITION_NOT_INIT);
  if (Number(input.value) !== 1) return noEmit(state);
  const slidePx = Number(props.slidePx ?? 30);
  const slideDy = Number(props.slideDy ?? 0);
  const dx = Number(state.dx ?? 0);
  const dy = Number(state.dy ?? 0);
  if (cur === PARTITION_NOT_INIT) {
    return {
      state: { ...state, phase: PARTITION_GROWING, dx: dx + slidePx, dy: dy + slideDy },
      emissions: [{ port: "out", value: 1 }],
    };
  }
  if (cur === PARTITION_GROWING) {
    return {
      state: { ...state, phase: PARTITION_STOPPED, dx: dx + slidePx, dy: dy + slideDy },
      emissions: [{ port: "out", value: 0 }],
    };
  }
  return noEmit(state);
};

// HANDLERS[type][inputPort] = handler. Types with no inputs (Input,
// Generic) have no entries — they're driven by seed events instead.
export const HANDLERS: Record<string, Record<string, HandlerFn>> = {
  ChainInhibitor: { in: chainInhibitorIn },
  InhibitRightGate: { left: inhibitRightJoin, right: inhibitRightJoin },
  ReadLatch: latchHandlers,
  DetectorLatch: latchHandlers,
  ReadGate: { chainIn: readGateJoin, ack: readGateJoin },
  SyncGate: { a: syncGateJoin, b: syncGateJoin },
  AndGate: { a: andGateJoin, b: andGateJoin },
  PatternAnd: { a: andGateJoin, b: andGateJoin },
  StreakBreakDetector: { old: sbdJoin, new: sbdJoin },
  StreakDetector: { old: sdJoin, new: sdJoin },
  Partition: { in: partitionIn },
  EdgeNode: { left: edgeJoin, right: edgeJoin },
  // Input: no handlers — driven by spec.timing.seed in Chunk B.
  // Generic: no handlers — placeholder type.
};

// Node types whose handlers buffer-and-wait (joins / latches). Used by
// the concurrency classifier: these mark serialization barriers, and
// any node downstream of one is treated as gated. Keep in sync with
// HANDLERS — adding a new join handler without listing it here will
// cause its downstream edges to be misclassified as concurrent.
// Node types whose handlers write `state.dx` / `state.dy`. Phase 6 Chunk B
// uses this to route paused-drag onto props (slidePx/slideDy) rather than
// base x/y, since base x/y is only the *origin* the per-step slide adds
// to. Keep in sync with handlers that write dx/dy — sibling rule to
// GATE_TYPES.
export const MOTION_TYPES: ReadonlySet<string> = new Set([
  "Partition",
]);

export const GATE_TYPES: ReadonlySet<string> = new Set([
  "AndGate",
  "SyncGate",
  "ReadGate",
  "InhibitRightGate",
  "PatternAnd",
  "ReadLatch",
  "DetectorLatch",
  "StreakBreakDetector",
  "StreakDetector",
  "EdgeNode",
]);

export function getHandler(
  nodeType: string,
  inputPort: string,
): HandlerFn | undefined {
  return HANDLERS[nodeType]?.[inputPort];
}
