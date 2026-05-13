// Node-kind implementations under the slot-in-node substrate.
//
// Input: each run() checks `outWire.canAccept` (wire empty AND dest
// slot empty) and loads the next queue value if so. No subscription,
// no ack — the wire returns to empty on arrival under its own
// machinery.
//
// ReadGate: variable-arity AND. Declares slots ports.inputs (N >= 1).
// Manual-gate destination — onRun is a no-op; each slot fills when its
// wire arrives. The single take button is armed only when ALL slots
// are "filled", and a click consumes every slot.

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Node, type NodeHandle, type SlotPhase } from "./Node";
import type { WireHandle } from "./Wire";

export function InputBody({
  nodeRef, outWireRef, initialQueue,
}: {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRef: RefObject<WireHandle | null>;
  initialQueue: unknown[];
}) {
  const remainingRef = useRef([...initialQueue]);

  const run = useCallback(() => {
    const handle = outWireRef.current;
    if (!handle) return;
    if (!handle.canAccept) return;
    if (remainingRef.current.length === 0) return;
    handle.load(remainingRef.current.shift());
  }, [outWireRef]);

  return <Node ref={nodeRef} onRun={run} />;
}

export function ChainInhibitorBody({
  nodeRef, outWireRef, slotId = "in",
}: {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRef: RefObject<WireHandle | null>;
  slotId?: string;
}) {
  const [canEmit, setCanEmit] = useState(false);

  const run = useCallback(() => {
    const node = nodeRef.current;
    const wire = outWireRef.current;
    if (!node || !wire) return;
    setCanEmit(wire.canAccept);
    if (node.slotPhase(slotId) !== "filled") return;
    if (!wire.canAccept) return;
    const value = node.consume(slotId);
    wire.load(value);
  }, [nodeRef, outWireRef, slotId]);

  const onEmit = useCallback(() => {
    const wire = outWireRef.current;
    if (!wire || !wire.canAccept) return;
    wire.load(1);
    setCanEmit(false);
  }, [outWireRef]);

  return (
    <>
      <Node ref={nodeRef} slots={[slotId]} onRun={run} />
      <button
        type="button"
        disabled={!canEmit}
        onClick={canEmit ? onEmit : undefined}
        data-armed={canEmit ? "true" : "false"}
        data-emit-id={slotId}
        style={{
          marginLeft: 6,
          padding: "1px 6px",
          fontSize: 11,
          lineHeight: 1.2,
          background: "#fff",
          border: "1px solid #333",
          borderRadius: 3,
          cursor: canEmit ? "pointer" : "default",
          opacity: canEmit ? 1 : 0.5,
        }}
      >
        ⇢
      </button>
    </>
  );
}

export function RelayBody({
  nodeRef, outWireRef, slotId = "in0",
}: {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRef: RefObject<WireHandle | null>;
  slotId?: string;
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

  return <Node ref={nodeRef} slots={[slotId]} onRun={run} />;
}

export function JoinBody({
  nodeRef, outWireRef, slotAId = "a", slotBId = "b",
}: {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRef: RefObject<WireHandle | null>;
  slotAId?: string;
  slotBId?: string;
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

  return <Node ref={nodeRef} slots={[slotAId, slotBId]} onRun={run} />;
}

export function ReadGateBody({
  nodeRef, slotIds,
}: {
  nodeRef: RefObject<NodeHandle | null>;
  slotIds: string[];
}) {
  const slots = slotIds.length > 0 ? slotIds : ["in0"];
  const key = slots.join("|");
  const [phases, setPhases] = useState<SlotPhase[]>(() => slots.map(() => "empty"));

  useEffect(() => {
    const handle = nodeRef.current;
    if (!handle) return;
    setPhases(slots.map((s) => handle.slotPhase(s)));
    const unsubs = slots.map((s, i) =>
      handle.subscribeSlot(s, (p) =>
        setPhases((prev) => {
          if (prev[i] === p) return prev;
          const next = prev.slice();
          next[i] = p;
          return next;
        }),
      ),
    );
    return () => { for (const u of unsubs) u(); };
  }, [nodeRef, key]);

  const armed = phases.length === slots.length && phases.every((p) => p === "filled");
  const onConsume = useCallback(() => {
    const handle = nodeRef.current;
    if (!handle) return;
    for (const s of slots) handle.requestConsume(s);
  }, [nodeRef, key]);

  return (
    <>
      <Node ref={nodeRef} slots={slots} />
      <button
        type="button"
        disabled={!armed}
        onClick={armed ? onConsume : undefined}
        data-armed={armed ? "true" : "false"}
        data-input-id={slots.join(",")}
        style={{
          marginLeft: 6,
          padding: "1px 6px",
          fontSize: 11,
          lineHeight: 1.2,
          background: "#fff",
          border: "1px solid #333",
          borderRadius: 3,
          cursor: armed ? "pointer" : "default",
          opacity: armed ? 1 : 0.5,
        }}
      >
        ⌫
      </button>
    </>
  );
}
