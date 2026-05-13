// ReadGateBody: variable-arity AND. When the instance declares an
// `out` port, the firing rule auto-consumes all slots and loads `1`
// on the out wire each tick the AND is satisfied. The ⌫ button is a
// manual consume kept for the no-out-wire case (debug / contract use).

import { useCallback, useEffect, useState, type RefObject } from "react";
import { Node, type NodeHandle, type SlotPhase } from "./Node";
import type { WireHandle } from "./Wire";

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
