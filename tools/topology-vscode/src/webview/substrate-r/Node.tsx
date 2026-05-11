// <Node>: substrate's node primitive realized as a render-less imperative
// component. Exposes run() (called by the tick driver) and
// requestTake(inputId) (called by host-rendered manual-take affordances).
// Visual rendering of the take button lives in the host node component
// so it can sit in the same HTML/SVG layer as the node body.

import {
  forwardRef, useImperativeHandle, useRef, type RefObject,
} from "react";
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
  onRun?: () => void;
}

export const Node = forwardRef<NodeHandle, NodeProps>(function Node(
  { inputs = [], onRun }, ref,
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

  return null;
});
