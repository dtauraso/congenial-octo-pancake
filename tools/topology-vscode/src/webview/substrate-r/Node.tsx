// <Node>: substrate's node primitive realized as a React component.
// Owns run() (called by the tick driver, delegates to node-type-specific
// onRun) and requestTake(inputId) (called by a manual-take button click;
// invokes take() on the named input wire if its phase is loaded).
//
// Manual-take affordance arming: <Node> subscribes to each manual-take
// input wire's phase via WireHandle.subscribePhase. The button is
// rendered enabled iff that input's phase is loaded. Direct read of
// the wire's own state, no frame snapshot.

import {
  forwardRef, useEffect, useImperativeHandle, useRef, useState,
  type ReactNode, type RefObject,
} from "react";
import type { Phase } from "./wire-phase";
import type { WireHandle } from "./Wire";

export interface NodeHandle {
  run(): void;
  requestTake(inputId: string): void;
}

export interface NodeInputDescriptor {
  id: string;
  wireRef: RefObject<WireHandle | null>;
  manualTake?: boolean;
}

export interface NodeOutputDescriptor {
  id: string;
  wireRef: RefObject<WireHandle | null>;
}

export interface NodeProps {
  inputs?: NodeInputDescriptor[];
  outputs?: NodeOutputDescriptor[];
  body?: ReactNode;
  onRun?: () => void;
}

export const Node = forwardRef<NodeHandle, NodeProps>(function Node(
  { inputs = [], outputs: _outputs = [], body, onRun }, ref,
) {
  const onRunRef = useRef(onRun);
  onRunRef.current = onRun;

  const requestTake = (inputId: string) => {
    const input = inputs.find((i) => i.id === inputId);
    if (!input) return;
    const handle = input.wireRef.current;
    if (!handle) return;
    if (handle.phase.kind !== "loaded") return;
    handle.take();
  };

  useImperativeHandle(ref, () => ({
    run: () => onRunRef.current?.(),
    requestTake,
  }));

  // Mirror each manual-take input's phase so the button re-renders on change.
  const manualInputs = inputs.filter((i) => i.manualTake);
  const [inputPhases, setInputPhases] = useState<Record<string, Phase["kind"]>>({});

  useEffect(() => {
    const unsubs: Array<() => void> = [];
    for (const input of manualInputs) {
      const handle = input.wireRef.current;
      if (!handle) continue;
      setInputPhases((m) => ({ ...m, [input.id]: handle.phase.kind }));
      const unsub = handle.subscribePhase((p) =>
        setInputPhases((m) => ({ ...m, [input.id]: p.kind })),
      );
      unsubs.push(unsub);
    }
    return () => { for (const u of unsubs) u(); };
  }, [manualInputs.map((i) => i.id).join("|")]);

  return (
    <g>
      {body}
      {manualInputs.map((input) => {
        const armed = inputPhases[input.id] === "loaded";
        return (
          <g key={input.id} className="manual-take-button">
            <rect
              x={-30} y={-12} width={20} height={16}
              fill={armed ? "#ffeb3b" : "#ddd"}
              stroke="#333" strokeWidth={armed ? 1.5 : 1}
              opacity={armed ? 1 : 0.5}
              style={{ cursor: armed ? "pointer" : "default" }}
              onClick={armed ? () => requestTake(input.id) : undefined}
              data-armed={armed ? "true" : "false"}
              data-input-id={input.id}
            />
          </g>
        );
      })}
    </g>
  );
});
