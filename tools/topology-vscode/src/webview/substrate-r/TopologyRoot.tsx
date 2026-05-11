// Minimal end-to-end harness for the new substrate primitives. Wires
// up one source node → one wire → one manual-take destination so the
// design can be exercised before the real cutover.
//
// Source policy: emit the next value from a queue whenever its output
// wire is empty. Source acks whenever its output wire becomes taken,
// via a long-lived subscribePhase. This mirrors what every real
// substrate node will need to do (the spec leaves source ack to the
// node implementation).
//
// Destination policy: manual-take. The <Node> renders a button that
// arms on `loaded` and clicks to `take()`. No animation completion
// callback wired; the wire's animation runs and rests at the
// destination end until the user clicks.

import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import { Wire, type WireHandle } from "./Wire";
import { Node, type NodeHandle } from "./Node";
import { useTickDriver } from "./useTickDriver";

function useEmittingSource(
  wireRef: RefObject<WireHandle | null>,
  initialQueue: unknown[],
) {
  const remainingRef = useRef([...initialQueue]);

  useEffect(() => {
    const handle = wireRef.current;
    if (!handle) return;
    return handle.subscribePhase((p) => {
      if (p.kind === "taken") handle.ack();
    });
  }, [wireRef]);

  return useCallback(() => {
    const handle = wireRef.current;
    if (!handle) return;
    if (handle.phase.kind !== "empty") return;
    if (remainingRef.current.length === 0) return;
    handle.load(remainingRef.current.shift());
  }, [wireRef]);
}

export interface TopologyRootProps {
  initialQueue?: unknown[];
  haltedOnMount?: boolean;
}

export function TopologyRoot({
  initialQueue = [1, 2, 3],
  haltedOnMount = false,
}: TopologyRootProps) {
  const wireRef = useRef<WireHandle | null>(null);
  const sourceRef = useRef<NodeHandle | null>(null);
  const destRef = useRef<NodeHandle | null>(null);

  const sourceRun = useEmittingSource(wireRef, initialQueue);

  const nodeRefs = useMemo(() => [sourceRef, destRef], []);
  const wireRefs = useMemo(() => [wireRef], []);
  const driver = useTickDriver({ nodeRefs, wireRefs });

  useEffect(() => {
    if (haltedOnMount) driver.halt();
    // intentional: one-shot mount behavior
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div data-testid="topology-root">
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={driver.halt} data-testid="halt">halt</button>
        <button onClick={driver.resume} data-testid="resume">resume</button>
        <button onClick={driver.step} data-testid="step">step</button>
        <span data-testid="tick">tick: {driver.tick}</span>
        <span data-testid="halted">{driver.halted ? "halted" : "running"}</span>
      </div>
      <svg width={400} height={160} data-testid="topology-svg">
        <g data-testid="source-node">
          <rect x={20} y={60} width={60} height={40} fill="#eee" stroke="#333" />
          <text x={50} y={84} textAnchor="middle">src</text>
          <Node ref={sourceRef} onRun={sourceRun} />
        </g>
        <g transform="translate(330, 80)" data-testid="dest-node">
          <rect x={-30} y={-20} width={60} height={40} fill="#eee" stroke="#333" />
          <text x={0} y={4} textAnchor="middle">dst</text>
          <Node
            ref={destRef}
            inputs={[{ id: "in", wireRef, manualTake: true }]}
          />
        </g>
        <Wire ref={wireRef} pathD="M 80 80 L 300 80" arcLength={220} />
      </svg>
    </div>
  );
}
