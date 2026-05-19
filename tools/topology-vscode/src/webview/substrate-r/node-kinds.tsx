// Node-kind implementations under the slot-in-node substrate. All
// kinds live in one file so the Node concept is one read, not five.
//
// Input: boundary node with an internal queue (no inbound wire). Each
// frame, if queue non-empty AND outWire canAccept, shift one value and
// load. Restarts from initialQueue on exhaustion. The canAccept guard
// is required here — wire.load is a silent no-op when in-flight, so
// without the guard a shifted value would be lost.

import { useCallback, useEffect, useRef, useState, type RefObject, type ReactNode } from "react";

import { Node, type NodeHandle } from "./Node";
import type { WireHandle } from "./Wire";
import type { RNodeKind } from "./spec";
import { postLog } from "../log/post";

export function InhibitRightGateBody({
  nodeRef,
  outWireRef,
  leftSlotId = "left",
  rightSlotId = "right",
  initialSlots,
  traceId,
}: {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRef?: RefObject<WireHandle | null>;
  leftSlotId?: string;
  rightSlotId?: string;
  initialSlots?: Record<string, unknown>;
  traceId?: string;
}) {
  const lastSkipReasonRef = useRef<string | null>(null);
  const run = useCallback(() => {
    const node = nodeRef.current;
    if (!node) return;
    // Inhibition rule: consume both slots; fire output only when left arrived
    // and right did not. Primitives are silent no-ops on empty slots.
    const leftFilled  = node.slotPhase(leftSlotId)  === "filled";
    const rightFilled = node.slotPhase(rightSlotId) === "filled";
    if (!leftFilled && !rightFilled) return;
    const wire = outWireRef?.current ?? null;
    if (leftFilled && !rightFilled && !wire?.canAccept) return;
    const leftValue = node.consume(leftSlotId);
    node.consume(rightSlotId);
    if (leftFilled && !rightFilled && wire) {
      if (traceId) postLog("trace.inhibitrightgate.fire", { node: traceId });
      lastSkipReasonRef.current = null;
      wire.load(leftValue);
    } else if (traceId) {
      const reason = !leftFilled ? "no-left" : rightFilled ? "inhibited" : "no-out-wire";
      if (reason !== lastSkipReasonRef.current) {
        postLog("trace.inhibitrightgate.skip", { node: traceId, reason });
        lastSkipReasonRef.current = reason;
      }
    }
  }, [nodeRef, outWireRef, leftSlotId, rightSlotId, traceId]);

  useEffect(() => {
    let raf = 0;
    const step = () => { run(); raf = requestAnimationFrame(step); }; // vocab-ok: visual layer
    raf = requestAnimationFrame(step); // vocab-ok: visual layer
    return () => cancelAnimationFrame(raf);
  }, [run]);

  return <Node ref={nodeRef} slots={[leftSlotId, rightSlotId]} initialSlots={initialSlots} onRun={run} traceId={traceId} />;
}

export interface KindBodyCtx {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRefs: Record<string, RefObject<WireHandle | null>>;
  slotIds: string[];
  initialQueue: unknown[];
  initialSlots?: Record<string, unknown>;
  traceId?: string;
}

// Required output wire names per kind.
// A kind is "inert" when any of these wires is unconnected (wireRef.current === null).
// inhibitrightgate has no required out wire — it fires (inhibiting) even without one.
const REQUIRED_OUT_WIRES: Partial<Record<RNodeKind, string[]>> = {
  input:            ["out"],
  relay:            ["out"],
  chainInhibitor:   ["out"],
  join:             ["out"],
  readgate:         ["out"],
  register:         ["out"],
};

export function isKindInert(
  kind: RNodeKind,
  outWireRefs: Record<string, import("react").RefObject<WireHandle | null>>,
): boolean {
  const required = REQUIRED_OUT_WIRES[kind];
  if (!required) return false;
  return required.some((name) => !outWireRefs[name]?.current);
}

// Single dispatch from validated kind to body component.
// RSubstrateNode is the only caller — one switch, one path.
export function renderKindBody(kind: RNodeKind, ctx: KindBodyCtx): ReactNode {
  const { nodeRef, outWireRefs, slotIds, initialQueue, initialSlots, traceId } = ctx;
  switch (kind) {
    case "input":
      return <InputBody nodeRef={nodeRef} outWireRef={outWireRefs["out"]} initialQueue={initialQueue} traceId={traceId} />;
    case "relay":
      return <RelayBody nodeRef={nodeRef} outWireRef={outWireRefs["out"]} slotId={slotIds[0]} initialSlots={initialSlots} traceId={traceId} />;
    case "chainInhibitor":
      return <ChainInhibitorBody nodeRef={nodeRef} outWireRef={outWireRefs["out"]} inhibitOutWireRef={outWireRefs["inhibitOut"]} slotId={slotIds[0]} initialSlots={initialSlots} traceId={traceId} />;
    case "join":
      return <JoinBody nodeRef={nodeRef} outWireRef={outWireRefs["out"]} slotAId={slotIds[0]} slotBId={slotIds[1]} initialSlots={initialSlots} traceId={traceId} />;
    case "readgate":
      return <ReadGateBody nodeRef={nodeRef} slotIds={slotIds} initialSlots={initialSlots} outWireRef={outWireRefs["out"]} traceId={traceId} />;
    case "inhibitrightgate":
      return <InhibitRightGateBody nodeRef={nodeRef} outWireRef={outWireRefs["out"]} leftSlotId={slotIds[0]} rightSlotId={slotIds[1]} initialSlots={initialSlots} traceId={traceId} />;
    case "register":
      return <RegisterBody nodeRef={nodeRef} outWireRef={outWireRefs["out"]} slotId={slotIds[0]} initialSlots={initialSlots} traceId={traceId} />;
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
  const remainingRef = useRef<unknown[]>([...initialQueue]);

  const run = useCallback(() => {
    const wire = outWireRef.current;
    if (!wire) return;
    if (!wire.canAccept) return;
    if (remainingRef.current.length === 0) {
      if (initialQueueRef.current.length === 0) return;
      remainingRef.current = [...initialQueueRef.current];
    }
    const v = remainingRef.current.shift();
    if (traceId) postLog("trace.input.fire", { node: traceId, value: v });
    wire.load(v);
  }, [outWireRef, traceId]);

  useEffect(() => {
    let raf = 0;
    const step = () => { run(); raf = requestAnimationFrame(step); }; // vocab-ok: visual layer
    raf = requestAnimationFrame(step); // vocab-ok: visual layer
    return () => cancelAnimationFrame(raf);
  }, [run]);

  return <Node ref={nodeRef} onRun={run} traceId={traceId} />;
}

export function RelayBody({
  nodeRef, outWireRef, slotId = "slot", initialSlots, traceId,
}: {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRef: RefObject<WireHandle | null>;
  slotId?: string;
  initialSlots?: Record<string, unknown>;
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

  useEffect(() => {
    let raf = 0;
    const step = () => { run(); raf = requestAnimationFrame(step); }; // vocab-ok: visual layer
    raf = requestAnimationFrame(step); // vocab-ok: visual layer
    return () => cancelAnimationFrame(raf);
  }, [run]);

  return <Node ref={nodeRef} slots={[slotId]} initialSlots={initialSlots} onRun={run} traceId={traceId} />;
}

export function JoinBody({
  nodeRef, outWireRef, slotAId = "a", slotBId = "b", initialSlots, traceId,
}: {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRef: RefObject<WireHandle | null>;
  slotAId?: string;
  slotBId?: string;
  initialSlots?: Record<string, unknown>;
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

  useEffect(() => {
    let raf = 0;
    const step = () => { run(); raf = requestAnimationFrame(step); }; // vocab-ok: visual layer
    raf = requestAnimationFrame(step); // vocab-ok: visual layer
    return () => cancelAnimationFrame(raf);
  }, [run]);

  return <Node ref={nodeRef} slots={[slotAId, slotBId]} initialSlots={initialSlots} onRun={run} traceId={traceId} />;
}

// ChainInhibitor: shift-register fanout. On in-fill, consume the
// slot, emit the prior held value on both wires, store the incoming
// as the new held. Atomic — all preconditions checked before commit.

export function ChainInhibitorBody({
  nodeRef, outWireRef, inhibitOutWireRef, slotId = "in", initialSlots, traceId,
}: {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRef: RefObject<WireHandle | null>;
  inhibitOutWireRef?: RefObject<WireHandle | null>;
  slotId?: string;
  initialSlots?: Record<string, unknown>;
  traceId?: string;
}) {
  const [heldDisplay, setHeldDisplay] = useState<unknown>(null);
  const lastSkipReasonRef = useRef<string | null>(null);

  const run = useCallback(() => {
    const node = nodeRef.current;
    const wire = outWireRef.current;
    if (!node || !wire) return;
    if (node.slotPhase(slotId) !== "filled") {
      if (traceId && lastSkipReasonRef.current !== "slot-not-filled") {
        postLog("trace.chainInhibitor.skip", { node: traceId, reason: "slot-not-filled" });
        lastSkipReasonRef.current = "slot-not-filled";
      }
      return;
    }
    if (node.slotPhase("held") !== "filled") return;
    lastSkipReasonRef.current = null;
    const inhibitWire = inhibitOutWireRef?.current ?? null;
    if (!wire.canAccept) return;
    if (inhibitWire && !inhibitWire.canAccept) return;
    const incoming = node.consume(slotId);
    const emitted = node.consume("held");
    node.fill("held", incoming);
    setHeldDisplay(incoming);
    if (traceId) postLog("trace.chainInhibitor.fire", { node: traceId, incoming, emitted });
    wire.load(emitted);
    if (inhibitWire) inhibitWire.load(emitted);
  }, [nodeRef, outWireRef, inhibitOutWireRef, slotId, traceId]);

  useEffect(() => {
    let raf = 0;
    const step = () => { run(); raf = requestAnimationFrame(step); }; // vocab-ok: visual layer
    raf = requestAnimationFrame(step); // vocab-ok: visual layer
    return () => cancelAnimationFrame(raf);
  }, [run]);

  return (
    <>
      <Node ref={nodeRef} slots={[slotId, "held"]} initialSlots={initialSlots} onRun={run} traceId={traceId} />
      <span style={{ position: "absolute", bottom: 4, left: 0, right: 0, fontWeight: 600, fontSize: 13, color: "#bf360c", textAlign: "center", pointerEvents: "none" }}>
        {`held=${heldDisplay}`}
      </span>
    </>
  );
}

// Register (delay buffer): emits the held secondary value when a pulse
// arrives, then stores the incoming secondary for the next fill.
// This is a one-fill shift-register pattern.

export function RegisterBody({
  nodeRef, outWireRef, slotId = "slot", initialSlots, traceId,
}: {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRef?: RefObject<WireHandle | null>;
  slotId?: string;
  initialSlots?: Record<string, unknown>;
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
  }, [nodeRef, outWireRef, slotId, traceId]);

  useEffect(() => {
    let raf = 0;
    const step = () => { run(); raf = requestAnimationFrame(step); }; // vocab-ok: visual layer
    raf = requestAnimationFrame(step); // vocab-ok: visual layer
    return () => cancelAnimationFrame(raf);
  }, [run]);

  return <Node ref={nodeRef} slots={[slotId]} initialSlots={initialSlots} onRun={run} traceId={traceId} />;
}

// ReadGate: variable-arity AND. When the instance declares an `out`
// port, the firing rule auto-consumes all slots and loads `1` on the
// out wire each time the AND fires. The ⌫ button is a manual
// consume kept for the no-out-wire case (debug / contract use).

export function ReadGateBody({
  nodeRef, slotIds, initialSlots, outWireRef, traceId,
}: {
  nodeRef: RefObject<NodeHandle | null>;
  slotIds: string[];
  initialSlots?: Record<string, unknown>;
  outWireRef?: RefObject<WireHandle | null>;
  traceId?: string;
}) {
  const slots = slotIds.length > 0 ? slotIds : ["slot"];
  const key = slots.join("|");

  const run = useCallback(() => {
    const handle = nodeRef.current;
    const wire = outWireRef?.current;
    if (!handle || !wire) return;
    const phases = slots.map((s) => handle.slotPhase(s));
    const allFilled = phases.every((p) => p === "filled");
    if (!allFilled) return;
    if (!wire.canAccept) return;
    // Emit the primary input slot's value (slots[0]), not a synthesised
    // 1. ReadGate is a gated pass-through: all secondary inputs must
    // be present, but the primary value flows through.
    const primary = handle.consume(slots[0]);
    for (let i = 1; i < slots.length; i++) handle.consume(slots[i]);
    if (traceId) postLog("trace.readgate.fire", { node: traceId, slots: slots.length, value: primary });
    wire.load(primary);
  }, [nodeRef, outWireRef, key, traceId]);

  useEffect(() => {
    let raf = 0;
    const step = () => { run(); raf = requestAnimationFrame(step); }; // vocab-ok: visual layer
    raf = requestAnimationFrame(step); // vocab-ok: visual layer
    return () => cancelAnimationFrame(raf);
  }, [run]);

  return <Node ref={nodeRef} slots={slots} initialSlots={initialSlots} onRun={run} traceId={traceId} />;
}
