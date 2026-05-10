// Shape A on the step substrate: Input -> ReadGate via a single slot.
//
// Per-tick rules:
//   Input.step():    if slot empty AND queue not exhausted, write next value.
//   ReadGate.step(): if slot full, consume it (publish held + tick).
//
// One writer per slot (Input). One reader (ReadGate). Gate-before-send
// is the slot's full/empty check; no ack channel, no latch, no AND.

import type { Spec, StateValue } from "../../schema";
import { readNodeInit } from "../../sim/seeds";
import type { StepNode } from "./node";
import { makeSlot, isFull, put, take } from "./node";

export interface ShapeAHooks {
  onInputTick?(): void;
  onReadGateTick?(v: StateValue): void;
}

export function buildShapeA(spec: Spec, hooks: ShapeAHooks = {}): StepNode[] {
  const input = spec.nodes.find((n) => n.type === "Input")!;
  const readGate = spec.nodes.find((n) => n.type === "ReadGate")!;
  const queue = readNodeInit(input.data);
  const slot = makeSlot<StateValue>();
  let i = 0;

  const inputNode: StepNode = {
    id: input.id,
    step() {
      if (isFull(slot)) return;
      if (queue.length === 0) return;
      put(slot, queue[i++ % queue.length]);
      hooks.onInputTick?.();
    },
  };
  const readGateNode: StepNode = {
    id: readGate.id,
    step() {
      if (!isFull(slot)) return;
      const v = take(slot)!;
      hooks.onReadGateTick?.(v);
    },
  };
  return [inputNode, readGateNode];
}
