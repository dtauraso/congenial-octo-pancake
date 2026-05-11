// @vitest-environment happy-dom
//
// <Node> contract: run() invokes onRun, requestTake invokes take on
// the matching input wire only if phase is loaded, and the manual-take
// button arms iff input wire's phase is loaded.

import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { useRef } from "react";
import { Node, type NodeHandle } from "../../src/webview/substrate-r/Node";
import { ManualTakeButton } from "../../src/webview/substrate-r/ManualTakeButton";
import type { WireHandle } from "../../src/webview/substrate-r/Wire";
import type { Phase } from "../../src/webview/substrate-r/wire-phase";

function makeMockWire(): WireHandle & { __setPhase(p: Phase): void } {
  const listeners = new Set<(p: Phase) => void>();
  let phase: Phase = { kind: "empty" };
  return {
    load: vi.fn((value) => { phase = { kind: "loaded", value }; listeners.forEach((l) => l(phase)); }),
    take: vi.fn(() => {
      if (phase.kind !== "loaded") return;
      phase = { kind: "taken", value: phase.value };
      listeners.forEach((l) => l(phase));
    }),
    ack: vi.fn(() => { phase = { kind: "empty" }; listeners.forEach((l) => l(phase)); }),
    get phase() { return phase; },
    subscribePhase(l) { listeners.add(l); return () => listeners.delete(l); },
    __setPhase(p) { phase = p; listeners.forEach((l) => l(p)); },
  };
}

function Harness({ wireRef, manualTake, onRun, nodeRef }: {
  wireRef: React.RefObject<WireHandle | null>;
  manualTake?: boolean;
  onRun?: () => void;
  nodeRef: React.RefObject<NodeHandle | null>;
}) {
  return (
    <>
      <Node
        ref={nodeRef}
        inputs={[{ id: "in0", wireRef, manualTake }]}
        onRun={onRun}
      />
      {manualTake && (
        <ManualTakeButton
          wireRef={wireRef}
          onTake={() => nodeRef.current?.requestTake("in0")}
        />
      )}
    </>
  );
}

describe("<Node>", () => {
  it("run() invokes onRun", () => {
    const onRun = vi.fn();
    const wire = makeMockWire();
    const wireRef = { current: wire } as React.RefObject<WireHandle | null>;
    const nodeRef = { current: null } as React.RefObject<NodeHandle | null>;
    render(<Harness wireRef={wireRef} onRun={onRun} nodeRef={nodeRef} />);
    nodeRef.current?.run();
    expect(onRun).toHaveBeenCalledOnce();
  });

  it("requestTake calls take() when input phase is loaded", () => {
    const wire = makeMockWire();
    wire.__setPhase({ kind: "loaded", value: 1 });
    const wireRef = { current: wire } as React.RefObject<WireHandle | null>;
    const nodeRef = { current: null } as React.RefObject<NodeHandle | null>;
    render(<Harness wireRef={wireRef} nodeRef={nodeRef} />);
    nodeRef.current?.requestTake("in0");
    expect(wire.take).toHaveBeenCalledOnce();
  });

  it("requestTake is a no-op when input phase is empty", () => {
    const wire = makeMockWire();
    const wireRef = { current: wire } as React.RefObject<WireHandle | null>;
    const nodeRef = { current: null } as React.RefObject<NodeHandle | null>;
    render(<Harness wireRef={wireRef} nodeRef={nodeRef} />);
    nodeRef.current?.requestTake("in0");
    expect(wire.take).not.toHaveBeenCalled();
  });

  it("manual-take button is disarmed when input is empty", () => {
    const wire = makeMockWire();
    const wireRef = { current: wire } as React.RefObject<WireHandle | null>;
    const nodeRef = { current: null } as React.RefObject<NodeHandle | null>;
    const { container } = render(
      <Harness wireRef={wireRef} manualTake nodeRef={nodeRef} />,
    );
    const btn = container.querySelector('[data-input-id="in0"]')!;
    expect(btn.getAttribute("data-armed")).toBe("false");
  });

  it("manual-take button arms when input wire enters loaded", () => {
    const wire = makeMockWire();
    const wireRef = { current: wire } as React.RefObject<WireHandle | null>;
    const nodeRef = { current: null } as React.RefObject<NodeHandle | null>;
    const { container } = render(
      <Harness wireRef={wireRef} manualTake nodeRef={nodeRef} />,
    );
    act(() => { wire.__setPhase({ kind: "loaded", value: 7 }); });
    const btn = container.querySelector('[data-input-id="in0"]')!;
    expect(btn.getAttribute("data-armed")).toBe("true");
  });

  it("clicking armed button invokes take on the wire", () => {
    const wire = makeMockWire();
    wire.__setPhase({ kind: "loaded", value: 7 });
    const wireRef = { current: wire } as React.RefObject<WireHandle | null>;
    const nodeRef = { current: null } as React.RefObject<NodeHandle | null>;
    const { container } = render(
      <Harness wireRef={wireRef} manualTake nodeRef={nodeRef} />,
    );
    const btn = container.querySelector('[data-input-id="in0"]')!;
    fireEvent.click(btn);
    expect(wire.take).toHaveBeenCalledOnce();
  });

  it("clicking disarmed button does nothing", () => {
    const wire = makeMockWire();
    const wireRef = { current: wire } as React.RefObject<WireHandle | null>;
    const nodeRef = { current: null } as React.RefObject<NodeHandle | null>;
    const { container } = render(
      <Harness wireRef={wireRef} manualTake nodeRef={nodeRef} />,
    );
    const btn = container.querySelector('[data-input-id="in0"]')!;
    fireEvent.click(btn);
    expect(wire.take).not.toHaveBeenCalled();
  });
});
