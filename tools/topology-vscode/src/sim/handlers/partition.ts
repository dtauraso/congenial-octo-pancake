// Partition: state machine NotInitialized → Growing → Stopped, advanced
// by value=1 on `in`. Mirrors PartitionNode/PartitionNode.go.
//
// Phase 6 Chunk A: writes `dx` into state on each transition so the
// renderer can tween a visible slide. props.slidePx (default 30) sets
// pixels per phase advance. Chunk B adds `dy` symmetrically for
// paused-drag.

import type { HandlerFn } from "../../schema";
import { noEmit } from "./utils";

const PARTITION_NOT_INIT = 0;
const PARTITION_GROWING = 1;
const PARTITION_STOPPED = 2;

export const partitionIn: HandlerFn = (state, input, props) => {
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
