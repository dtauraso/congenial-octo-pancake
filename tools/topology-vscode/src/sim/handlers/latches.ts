// Latches (ReadLatch, DetectorLatch): buffer `in` until `release`
// arrives, then emit out + ack and clear.

import type { HandlerFn } from "../../schema";
import { clear, noEmit } from "./utils";

export const latchHandlers: Record<string, HandlerFn> = {
  in: (state, input) =>
    noEmit({ ...state, held: input.value, __hasHeld: 1 }),
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
