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
  traceId,
}: {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRef?: RefObject<WireHandle | null>;
  leftSlotId?: string;
  rightSlotId?: string;
  traceId?: string;
}) {
  const lastSkipReasonRef = useRef<string | null>(null);
  const run = useCallback(() => {
    const node = nodeRef.current;
    if (!node) return;
    // Inhibition rule: consume both slots; fire output only when left arrived
    // and right did not. Primitives are silent no-ops on empty slots.
    const leftFilled = node.slotPhase(leftSlotId) === "filled";
    const rightFilled = node.slotPhase(rightSlotId) === "filled";
    const leftValue = node.consume(leftSlotId);
    node.consume(rightSlotId);
    const wire = outWireRef?.current ?? null;
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

  return <Node ref={nodeRef} slots={[leftSlotId, rightSlotId]} onRun={run} traceId={traceId} />;
}

export interface KindBodyCtx {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRefs: Record<string, RefObject<WireHandle | null>>;
  slotIds: string[];
  initialQueue: unknown[];
  seed?: unknown;
  traceId?: string;
}

// Single dispatch from validated kind to body component.
// RSubstrateNode is the only caller — one switch, one path.
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
  nodeRef, outWireRef, slotId = "slot", traceId,
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
    const value = node.consume(slotId);
    wire.load(value);
  }, [nodeRef, outWireRef, slotId]);

  useEffect(() => {
    let raf = 0;
    const step = () => { run(); raf = requestAnimationFrame(step); }; // vocab-ok: visual layer
    raf = requestAnimationFrame(step); // vocab-ok: visual layer
    return () => cancelAnimationFrame(raf);
  }, [run]);

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
  const [heldDisplay, setHeldDisplay] = useState<unknown>(seed ?? null);
  const lastSkipReasonRef = useRef<string | null>(null);

  const run = useCallback(() => {
    const node = nodeRef.current;
    const wire = outWireRef.current;
    if (!node || !wire) return;
    if (node.slotPhase(slotId) !== "filled") {
      if (traceId && lastSkipReasonRef.current !== "slot-not-filled") {
        postLog("trace.chaininhibitor.skip", { node: traceId, reason: "slot-not-filled" });
        lastSkipReasonRef.current = "slot-not-filled";
      }
      return;
    }
    lastSkipReasonRef.current = null;
    const inhibitWire = inhibitOutWireRef?.current;
    const incoming = node.consume(slotId);
    const emitted = heldRef.current;
    heldRef.current = incoming;
    setHeldDisplay(incoming);
    if (traceId) postLog("trace.chaininhibitor.fire", { node: traceId, incoming, emitted });
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
      <Node ref={nodeRef} slots={[slotId]} onRun={run} traceId={traceId} />
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
  nodeRef, outWireRef, slotId = "slot", traceId,
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

  return <Node ref={nodeRef} slots={[slotId]} onRun={run} traceId={traceId} />;
}

// ReadGate: variable-arity AND. When the instance declares an `out`
// port, the firing rule auto-consumes all slots and loads `1` on the
// out wire each time the AND fires. The ⌫ button is a manual
// consume kept for the no-out-wire case (debug / contract use).

export function ReadGateBody({
  nodeRef, slotIds, outWireRef, traceId,
}: {
  nodeRef: RefObject<NodeHandle | null>;
  slotIds: string[];
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

  return <Node ref={nodeRef} slots={slots} onRun={run} traceId={traceId} />;
}
