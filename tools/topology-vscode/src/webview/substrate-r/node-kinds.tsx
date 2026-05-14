// Node-kind implementations under the slot-in-node substrate. All
// kinds live in one file so the Node concept is one read, not five.
//
// Input: each run() checks `outWire.canAccept` (wire empty AND dest
// slot empty) and loads the next queue value if so. No subscription,
// no ack — the wire returns to empty on arrival under its own
// machinery.

import { useCallback, useEffect, useRef, useState, type RefObject, type ReactNode } from "react";
import { Node, type NodeHandle, type SlotPhase } from "./Node";
import type { WireHandle } from "./Wire";
import type { RNodeKind } from "./spec";

export interface KindBodyCtx {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRef: RefObject<WireHandle | null>;
  slotIds: string[];
  initialQueue: unknown[];
}

// Single dispatch from validated kind to body component. Both
// TopologyRoot (test path) and RSubstrateNode (editor path) call this
// — there is no second switch to keep in sync.
export function renderKindBody(kind: RNodeKind, ctx: KindBodyCtx): ReactNode {
  const { nodeRef, outWireRef, slotIds, initialQueue } = ctx;
  switch (kind) {
    case "input":
      return <InputBody nodeRef={nodeRef} outWireRef={outWireRef} initialQueue={initialQueue} />;
    case "relay":
      return <RelayBody nodeRef={nodeRef} outWireRef={outWireRef} slotId={slotIds[0]} />;
    case "chaininhibitor":
      return <ChainInhibitorBody nodeRef={nodeRef} outWireRef={outWireRef} slotId={slotIds[0]} />;
    case "join":
      return <JoinBody nodeRef={nodeRef} outWireRef={outWireRef} slotAId={slotIds[0]} slotBId={slotIds[1]} />;
    case "readgate":
      return <ReadGateBody nodeRef={nodeRef} slotIds={slotIds} outWireRef={outWireRef} />;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

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

// ChainInhibitor: consumes its slot and forwards on tick when the
// out wire can accept. The manual ⇢ button is a debug aid emitting
// a literal `1` when the out wire is free.

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
        style={kindButtonStyle(canEmit)}
      >
        ⇢
      </button>
    </>
  );
}

// ReadGate: variable-arity AND. When the instance declares an `out`
// port, the firing rule auto-consumes all slots and loads `1` on the
// out wire each tick the AND is satisfied. The ⌫ button is a manual
// consume kept for the no-out-wire case (debug / contract use).

export function ReadGateBody({
  nodeRef, slotIds, outWireRef,
}: {
  nodeRef: RefObject<NodeHandle | null>;
  slotIds: string[];
  outWireRef?: RefObject<WireHandle | null>;
}) {
  const slots = slotIds.length > 0 ? slotIds : ["in0"];
  const key = slots.join("|");
  const [phases, setPhases] = useState<SlotPhase[]>(() => slots.map(() => "empty"));

  const run = useCallback(() => {
    const handle = nodeRef.current;
    const wire = outWireRef?.current;
    if (!handle || !wire) return;
    if (!slots.every((s) => handle.slotPhase(s) === "filled")) return;
    if (!wire.canAccept) return;
    for (const s of slots) handle.consume(s);
    wire.load(1);
  }, [nodeRef, outWireRef, key]);

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
      <Node ref={nodeRef} slots={slots} onRun={run} />
      <button
        type="button"
        disabled={!armed}
        onClick={armed ? onConsume : undefined}
        data-armed={armed ? "true" : "false"}
        data-input-id={slots.join(",")}
        style={kindButtonStyle(armed)}
      >
        ⌫
      </button>
    </>
  );
}

function kindButtonStyle(armed: boolean) {
  return {
    marginLeft: 6,
    padding: "1px 6px",
    fontSize: 11,
    lineHeight: 1.2,
    background: "#fff",
    border: "1px solid #333",
    borderRadius: 3,
    cursor: armed ? "pointer" : "default",
    opacity: armed ? 1 : 0.5,
  } as const;
}
