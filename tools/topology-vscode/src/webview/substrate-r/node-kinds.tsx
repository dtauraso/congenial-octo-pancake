// Node-kind implementations under the slot-in-node substrate. All
// kinds live in one file so the Node concept is one read, not five.
//
// Input: each run() checks `outWire.canAccept` (wire empty AND dest
// slot empty) and loads the next queue value if so. No subscription,
// no ack — the wire returns to empty on arrival under its own
// machinery.

import { useCallback, useEffect, useRef, type RefObject, type ReactNode } from "react";
import { Node, type NodeHandle } from "./Node";
import type { WireHandle } from "./Wire";
import type { RNodeKind } from "./spec";
import { postLog } from "../log/post";
import { InhibitRightGateBody } from "./inhibit-right-gate";

export interface KindBodyCtx {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRefs: Record<string, RefObject<WireHandle | null>>;
  slotIds: string[];
  initialQueue: unknown[];
  seed?: unknown;
  traceId?: string;
}

// Single dispatch from validated kind to body component. Both
// TopologyRoot (test path) and RSubstrateNode (editor path) call this
// — there is no second switch to keep in sync.
export function renderKindBody(kind: RNodeKind, ctx: KindBodyCtx): ReactNode {
  const { nodeRef, outWireRefs, slotIds, initialQueue, seed, traceId } = ctx;
  switch (kind) {
    case "input":
      return <InputBody nodeRef={nodeRef} outWireRef={outWireRefs["out"]} initialQueue={initialQueue} traceId={traceId} />;
    case "relay":
      return <RelayBody nodeRef={nodeRef} outWireRef={outWireRefs["out"]} slotId={slotIds[0]} traceId={traceId} />;
    case "chaininhibitor":
      return <ChainInhibitorBody nodeRef={nodeRef} outWireRef={outWireRefs["out"]} inhibitOutWireRef={outWireRefs["inhibitOut"]} slotId={slotIds[0]} seed={seed} traceId={traceId} />;
    case "join":
      return <JoinBody nodeRef={nodeRef} outWireRef={outWireRefs["out"]} slotAId={slotIds[0]} slotBId={slotIds[1]} traceId={traceId} />;
    case "readgate":
      return <ReadGateBody nodeRef={nodeRef} slotIds={slotIds} outWireRef={outWireRefs["out"]} traceId={traceId} />;
    case "inhibitrightgate":
      return <InhibitRightGateBody nodeRef={nodeRef} outWireRef={outWireRefs["out"]} leftSlotId={slotIds[0]} rightSlotId={slotIds[1]} traceId={traceId} />;
    case "register":
      return <RegisterBody nodeRef={nodeRef} outWireRef={outWireRefs["out"]} slotId={slotIds[0]} traceId={traceId} />;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function InputBody({
  nodeRef, outWireRef, initialQueue, traceId,
}: {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRef: RefObject<WireHandle | null>;
  initialQueue: unknown[];
  traceId?: string;
}) {
  const initialQueueRef = useRef(initialQueue);
  const remainingRef = useRef([...initialQueue]);
  const queuePhaseRef = useRef<"draining" | "exhausted">(
    initialQueue.length > 0 ? "draining" : "exhausted"
  );

  // Firing rule: only runs when draining. Does not restart.
  const run = useCallback(() => {
    if (queuePhaseRef.current !== "draining") return;
    const handle = outWireRef.current;
    if (!handle) {
      if (traceId) postLog("trace.input.skip", { node: traceId, reason: "no-wire" });
      return;
    }
    if (!handle.canAccept) {
      if (traceId) postLog("trace.input.skip", { node: traceId, reason: "wire-blocked", phase: handle.phase.kind });
      return;
    }
    const v = remainingRef.current.shift()!;
    if (remainingRef.current.length === 0) queuePhaseRef.current = "exhausted";
    if (traceId) postLog("trace.input.fire", { node: traceId, value: v });
    handle.load(v);
  }, [outWireRef, traceId]);

  const onCanAccept = useCallback(() => {
    if (queuePhaseRef.current === "exhausted" && initialQueueRef.current.length > 0) {
      remainingRef.current = [...initialQueueRef.current];
      queuePhaseRef.current = "draining";
    }
    run();
  }, [run]);

  useEffect(() => {
    const handle = outWireRef.current;
    if (!handle) return;
    const unsub = handle.subscribeCanAccept(onCanAccept);
    onCanAccept();
    return unsub;
  }, [outWireRef, onCanAccept]);

  return <Node ref={nodeRef} onRun={run} traceId={traceId} />;
}

export function RelayBody({
  nodeRef, outWireRef, slotId = "in0", traceId,
}: {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRef: RefObject<WireHandle | null>;
  slotId?: string;
  traceId?: string;
}) {
  const run = useCallback(() => {
    const node = nodeRef.current;
    const wire = outWireRef.current;
    if (!node || !wire) return;
    if (node.slotPhase(slotId) !== "filled") return;
    if (!wire.canAccept) return;
    const value = node.consume(slotId);
    wire.load(value);
  }, [nodeRef, outWireRef, slotId]);

  return <Node ref={nodeRef} slots={[slotId]} onRun={run} traceId={traceId} />;
}

export function JoinBody({
  nodeRef, outWireRef, slotAId = "a", slotBId = "b", traceId,
}: {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRef: RefObject<WireHandle | null>;
  slotAId?: string;
  slotBId?: string;
  traceId?: string;
}) {
  const run = useCallback(() => {
    const node = nodeRef.current;
    const wire = outWireRef.current;
    if (!node || !wire) return;
    if (node.slotPhase(slotAId) !== "filled") return;
    if (node.slotPhase(slotBId) !== "filled") return;
    if (!wire.canAccept) return;
    const va = node.consume(slotAId);
    const vb = node.consume(slotBId);
    wire.load([va, vb]);
  }, [nodeRef, outWireRef, slotAId, slotBId]);

  return <Node ref={nodeRef} slots={[slotAId, slotBId]} onRun={run} traceId={traceId} />;
}

// ChainInhibitor: shift-register fanout. On in-fill, consume the
// slot, emit the prior held value on both wires, store the incoming
// as the new held. Atomic — all preconditions checked before commit.

export function ChainInhibitorBody({
  nodeRef, outWireRef, inhibitOutWireRef, slotId = "in", seed, traceId,
}: {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRef: RefObject<WireHandle | null>;
  inhibitOutWireRef?: RefObject<WireHandle | null>;
  slotId?: string;
  seed?: unknown;
  traceId?: string;
}) {
  const heldRef = useRef<unknown>(seed ?? null);

  const run = useCallback(() => {
    const node = nodeRef.current;
    const wire = outWireRef.current;
    if (!node || !wire) return;
    if (node.slotPhase(slotId) !== "filled") return;
    const inhibitWire = inhibitOutWireRef?.current;
    const incoming = node.consume(slotId);
    const emitted = heldRef.current;
    heldRef.current = incoming;
    wire.load(emitted);
    if (inhibitWire) inhibitWire.load(emitted);
  }, [nodeRef, outWireRef, inhibitOutWireRef, slotId]);

  useEffect(() => {
    const wire = outWireRef.current;
    if (!wire) return;
    return wire.subscribeCanAccept(run);
  }, [outWireRef, run]);

  useEffect(() => {
    const inhibitWire = inhibitOutWireRef?.current;
    if (!inhibitWire) return;
    return inhibitWire.subscribeCanAccept(run);
  }, [inhibitOutWireRef, run]);

  return <Node ref={nodeRef} slots={[slotId]} onRun={run} traceId={traceId} />;
}

// Register (delay buffer): emits the held secondary value when a pulse
// arrives, then stores the incoming secondary for the next round.
// This is a one-round shift-register pattern.

export function RegisterBody({
  nodeRef, outWireRef, slotId = "in0", traceId,
}: {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRef?: RefObject<WireHandle | null>;
  slotId?: string;
  traceId?: string;
}) {
  const heldRef = useRef<unknown>(null);

  const run = useCallback(() => {
    const node = nodeRef.current;
    const wire = outWireRef?.current;
    if (!node || !wire) return;
    if (node.slotPhase(slotId) !== "filled") return;
    if (!wire.canAccept) return;
    const incoming = node.consume(slotId);
    const emitted = heldRef.current;
    heldRef.current = incoming;
    if (traceId) postLog("trace.register.fire", { node: traceId, emitted, incoming });
    wire.load(emitted);
  }, [nodeRef, outWireRef, slotId]);

  useEffect(() => {
    const wire = outWireRef?.current;
    if (!wire) return;
    return wire.subscribeCanAccept(run);
  }, [outWireRef, run]);

  return <Node ref={nodeRef} slots={[slotId]} onRun={run} traceId={traceId} />;
}

// ReadGate: variable-arity AND. When the instance declares an `out`
// port, the firing rule auto-consumes all slots and loads `1` on the
// out wire each tick the AND is satisfied. The ⌫ button is a manual
// consume kept for the no-out-wire case (debug / contract use).

export function ReadGateBody({
  nodeRef, slotIds, outWireRef, traceId,
}: {
  nodeRef: RefObject<NodeHandle | null>;
  slotIds: string[];
  outWireRef?: RefObject<WireHandle | null>;
  traceId?: string;
}) {
  const slots = slotIds.length > 0 ? slotIds : ["in0"];
  const key = slots.join("|");

  const run = useCallback(() => {
    const handle = nodeRef.current;
    const wire = outWireRef?.current;
    if (!handle || !wire) return;
    if (!wire.canAccept) {
      if (traceId) postLog("trace.readgate.skip", { node: traceId, reason: "wire-blocked", phase: wire.phase.kind });
      return;
    }
    const phases = slots.map((s) => handle.slotPhase(s));
    const filledSlots = slots.filter((_, i) => phases[i] === "filled");
    const allFilled = filledSlots.length === slots.length;
    if (allFilled) {
      if (traceId) postLog("trace.readgate.fire", { node: traceId, slots: slots.length });
      for (const s of slots) handle.consume(s);
      wire.load(1);
    } else {
      if (traceId) postLog("trace.readgate.partial", { node: traceId, filled: filledSlots.length, of: slots.length });
      wire.load(0);
    }
  }, [nodeRef, outWireRef, key, traceId]);

  return <Node ref={nodeRef} slots={slots} onRun={run} traceId={traceId} />;
}
