// AND-style join handlers: ReadGate / SyncGate / AndGate / PatternAnd /
// InhibitRightGate / EdgeNode. Each buffers one input and fires when
// both inputs are present.

import type { HandlerFn } from "../../schema";
import { buffer, clear, has, makeJoin, noEmit } from "./utils";

export const readGateJoin = makeJoin(["chainIn", "ack"], "out", (a) => a);
export const syncGateJoin = makeJoin(["a", "b"], "release", () => 1);
export const andGateJoin = makeJoin(["a", "b"], "out", (a, b) =>
  Number(a) === 1 && Number(b) === 1 ? 1 : 0,
);
// InhibitRightGate fires only when left=1 and right=0.
export const inhibitRightJoin = makeJoin(["left", "right"], "out", (l, r) =>
  Number(l) === 1 && Number(r) === 0 ? 1 : 0,
);

// EdgeNode: XOR contrast detector. Buffer left/right; on both present
// emit l^r identically on three outputs (current inhibitor, partition,
// next edge), mirroring the three S.Send calls in EdgeNode/EdgeNode.go.
export const edgeJoin: HandlerFn = (state, input) => {
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
