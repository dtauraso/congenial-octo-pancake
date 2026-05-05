// ChainInhibitor: `in` arrives → emit held value on inhibitOut, new
// value on readNew, held on out, ack=1, then store new as held.
// Order mirrors ChainInhibitorNode/ChainInhibitorNode.go (ToEdge,
// ToEdgeNew, ToNext, ToAck) so trace projection matches.

import type { HandlerFn } from "../../schema";

export const chainInhibitorIn: HandlerFn = (state, input) => {
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
