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
  traceId?: string;
}

// Single dispatch from validated kind to body component. Both
// TopologyRoot (test path) and RSubstrateNode (editor path) call this
// — there is no second switch to keep in sync.
export function renderKindBody(kind: RNodeKind, ctx: KindBodyCtx): ReactNode {
  const { nodeRef, outWireRefs, slotIds, initialQueue, traceId } = ctx;
  switch (kind) {
    case "input":
      return <InputBody nodeRef={nodeRef} outWireRef={outWireRefs["out"]} initialQueue={initialQueue} traceId={traceId} />;
    case "relay":
      return <RelayBody nodeRef={nodeRef} outWireRef={outWireRefs["out"]} slotId={slotIds[0]} traceId={traceId} />;
    case "chaininhibitor":
      return <ChainInhibitorBody nodeRef={nodeRef} outWireRef={outWireRefs["out"]} inhibitOutWireRef={outWireRefs["inhibitOut"]} slotId={slotIds[0]} traceId={traceId} />;
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
    if (remainingRef.current.length === 0) queuePhaseRef.current = "exhausted"; // draining → exhausted
    if (traceId) postLog("trace.input.fire", { node: traceId, value: v });
    handle.load(v);
  }, [outWireRef, traceId]);

  // State machine driver: restarts the queue on canAccept when exhausted,
  // then delegates to the firing rule.
  const onCanAccept = useCallback(() => {
    if (queuePhaseRef.current === "exhausted" && initialQueueRef.current.length > 0) {
      remainingRef.current = [...initialQueueRef.current];
      queuePhaseRef.current = "draining"; // exhausted → draining
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

// ChainInhibitor: consumes its slot and forwards when the out wire can accept.

export function ChainInhibitorBody({
  nodeRef, outWireRef, inhibitOutWireRef, slotId = "in", traceId,
}: {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRef: RefObject<WireHandle | null>;
  inhibitOutWireRef?: RefObject<WireHandle | null>;
  slotId?: string;
  traceId?: string;
}) {
  const run = useCallback(() => {
    const node = nodeRef.current;
    const wire = outWireRef.current;
    if (!node || !wire) return;
    if (node.slotPhase(slotId) !== "filled") return;
    if (!wire.canAccept) return;
    const inhibitWire = inhibitOutWireRef?.current;
    if (inhibitWire && !inhibitWire.canAccept) return;
    const value = node.consume(slotId);
    wire.load(value);
    if (inhibitWire) inhibitWire.load(value);
  }, [nodeRef, outWireRef, inhibitOutWireRef, slotId]);

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
    const incoming = node.consume(slotId) as { primary: unknown; secondary: unknown } | unknown;
    const incomingSecondary = incoming !== null && typeof incoming === "object" && "secondary" in (incoming as object)
      ? (incoming as { primary: unknown; secondary: unknown }).secondary
      : incoming;
    const incomingPrimary = incoming !== null && typeof incoming === "object" && "primary" in (incoming as object)
      ? (incoming as { primary: unknown; secondary: unknown }).primary
      : 1;
    const emitted = heldRef.current;
    heldRef.current = incomingSecondary;
    if (traceId) postLog("trace.register.fire", { node: traceId, emitted, incoming: incomingSecondary });
    wire.load({ primary: incomingPrimary, secondary: emitted });
  }, [nodeRef, outWireRef, slotId]);

  // Re-try run when the output wire becomes available (backpressure release).
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

  // Track the last-emitted partial-fill signature to avoid re-emit storms.
  // Stores a sorted string of filled slot IDs, or null if none emitted yet.
  const lastPartialSigRef = useRef<string | null>(null);

  const run = useCallback(() => {
    const handle = nodeRef.current;
    const wire = outWireRef?.current;
    if (!handle || !wire) return;
    const phases = slots.map((s) => handle.slotPhase(s));
    const filledSlots = slots.filter((_, i) => phases[i] === "filled");
    if (filledSlots.length === 0) {
      if (traceId) postLog("trace.readgate.skip", { node: traceId, reason: "slots-not-filled", phases: Object.fromEntries(slots.map((s, i) => [s, phases[i]])) });
      return;
    }
    if (!wire.canAccept) {
      if (traceId) postLog("trace.readgate.skip", { node: traceId, reason: "wire-blocked", phase: wire.phase.kind });
      return;
    }
    const allFilled = filledSlots.length === slots.length;
    if (allFilled) {
      // Full fire: consume all slots and emit secondary=1.
      if (traceId) postLog("trace.readgate.fire", { node: traceId, slots: slots.length });
      for (const s of slots) handle.consume(s);
      lastPartialSigRef.current = null; // reset so next partial fill emits
      wire.load({ primary: 1, secondary: 1 });
    } else {
      // Partial fill: emit secondary=0 only if filled set changed.
      const sig = [...filledSlots].sort().join(",");
      if (sig === lastPartialSigRef.current) return; // no change, skip
      lastPartialSigRef.current = sig;
      if (traceId) postLog("trace.readgate.partial", { node: traceId, filled: filledSlots.length, of: slots.length });
      wire.load({ primary: 1, secondary: 0 });
    }
  }, [nodeRef, outWireRef, key, traceId]);

  return <Node ref={nodeRef} slots={slots} onRun={run} traceId={traceId} />;
}
