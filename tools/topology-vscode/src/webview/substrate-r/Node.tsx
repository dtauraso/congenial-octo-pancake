// <Node>: substrate's node primitive. Owns input slots — each slot is
// passive state on the destination node, not on the wire arriving at
// it. Slots are declared by id at mount time and start `empty`.
//
// Slot phases recognized in this commit: "empty" | "filled". The
// model's "consumed" intermediate is collapsed into consume()'s atomic
// filled→empty for now (no observable difference yet).
//
// onRun wires a body's run() callback into NodeHandle.run(). Under
// the polling model, Node.fill() does NOT call onRun — bodies
// self-wake via their own RAF poll loop.

import {
  forwardRef, useImperativeHandle, useMemo, useRef,
} from "react";
import { postLog } from "../log/post";

export type SlotPhase = "empty" | "filled";

export interface NodeHandle {
  run(): void;
  fill(slotId: string, value: unknown): void;
  consume(slotId: string): unknown;
  slotPhase(slotId: string): SlotPhase;
  subscribeSlot(slotId: string, cb: (p: SlotPhase) => void): () => void;
  requestConsume(slotId: string): void;
}

export interface NodeProps {
  slots?: string[];
  onRun?: () => void;
  onConsume?: (slotId: string, value: unknown) => void;
  traceId?: string;
}

interface SlotState {
  phase: SlotPhase;
  value: unknown;
  listeners: Set<(p: SlotPhase) => void>;
}

export const Node = forwardRef<NodeHandle, NodeProps>(function Node(
  { slots = [], onRun, onConsume, traceId }, ref,
) {
  const onRunRef = useRef(onRun);
  onRunRef.current = onRun;
  const onConsumeRef = useRef(onConsume);
  onConsumeRef.current = onConsume;

  const slotMap = useMemo(() => {
    const m = new Map<string, SlotState>();
    for (const id of slots) m.set(id, { phase: "empty", value: undefined, listeners: new Set() });
    return m;
  }, [slots.join("|")]);

  const get = (slotId: string): SlotState => {
    const s = slotMap.get(slotId);
    if (!s) throw new Error(`Node: unknown slot ${slotId}`);
    return s;
  };

  useImperativeHandle(ref, () => ({
    run: () => onRunRef.current?.(),
    fill(slotId, value) {
      const s = get(slotId);
      if (s.phase !== "empty") return; // silent no-op: slot already filled; source observes phase and retries
      s.phase = "filled";
      s.value = value;
      if (traceId) postLog("trace.fill", { node: traceId, slot: slotId, value });
      for (const l of s.listeners) l("filled");
    },
    consume(slotId) {
      const s = get(slotId);
      if (s.phase !== "filled") return undefined; // silent no-op: slot not filled; body retries next poll
      const v = s.value;
      s.phase = "empty";
      s.value = undefined;
      if (traceId) postLog("trace.consume", { node: traceId, slot: slotId, value: v });
      for (const l of s.listeners) l("empty");
      return v;
    },
    slotPhase: (slotId) => get(slotId).phase,
    subscribeSlot(slotId, cb) {
      const s = get(slotId);
      s.listeners.add(cb);
      return () => { s.listeners.delete(cb); };
    },
    requestConsume(slotId) {
      const s = get(slotId);
      if (s.phase !== "filled") return;
      const v = s.value;
      s.phase = "empty";
      s.value = undefined;
      for (const l of s.listeners) l("empty");
      onConsumeRef.current?.(slotId, v);
    },
  }));

  return null;
});
