// @vitest-environment happy-dom
//
// <Node> contract under slot-in-node: declares slots, accepts fill,
// emits consume, exposes slot phase, notifies subscribers. The
// manual-consume button arms iff the named slot is "filled" and
// invokes requestConsume on click.

import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, render } from "@testing-library/react";
import { Node, type NodeHandle } from "../../src/webview/substrate-r/Node";
import { ManualTakeButton } from "../../src/webview/substrate-r/ManualTakeButton";

function Harness({ slots, onRun, onConsume, manualSlot, nodeRef }: {
  slots?: string[];
  onRun?: () => void;
  onConsume?: (slotId: string, v: unknown) => void;
  manualSlot?: string;
  nodeRef: React.RefObject<NodeHandle | null>;
}) {
  return (
    <>
      <Node ref={nodeRef} slots={slots} onRun={onRun} onConsume={onConsume} />
      {manualSlot && (
        <ManualTakeButton
          nodeRef={nodeRef}
          slotId={manualSlot}
          onConsume={() => nodeRef.current?.requestConsume(manualSlot)}
        />
      )}
    </>
  );
}

describe("<Node>", () => {
  it("run() invokes onRun", () => {
    const onRun = vi.fn();
    const nodeRef = { current: null } as React.RefObject<NodeHandle | null>;
    render(<Harness onRun={onRun} nodeRef={nodeRef} />);
    nodeRef.current?.run();
    expect(onRun).toHaveBeenCalledOnce();
  });

  it("declared slot starts empty; fill marks it filled; consume returns value and empties", () => {
    const nodeRef = { current: null } as React.RefObject<NodeHandle | null>;
    render(<Harness slots={["a"]} nodeRef={nodeRef} />);
    expect(nodeRef.current!.slotPhase("a")).toBe("empty");
    nodeRef.current!.fill("a", 42);
    expect(nodeRef.current!.slotPhase("a")).toBe("filled");
    expect(nodeRef.current!.consume("a")).toBe(42);
    expect(nodeRef.current!.slotPhase("a")).toBe("empty");
  });

  it("fill does not synchronously invoke onRun (polling model)", () => {
    // Under the polling model, fill() is a pure slot write. Bodies
    // wake via their own RAF loop, not via a fill-triggered onRun call.
    const onRun = vi.fn();
    const nodeRef = { current: null } as React.RefObject<NodeHandle | null>;
    render(<Harness slots={["a"]} onRun={onRun} nodeRef={nodeRef} />);
    onRun.mockClear();
    nodeRef.current!.fill("a", 1);
    expect(onRun).not.toHaveBeenCalled();
  });

  it("subscribeSlot fires on fill and consume", () => {
    const nodeRef = { current: null } as React.RefObject<NodeHandle | null>;
    render(<Harness slots={["a"]} nodeRef={nodeRef} />);
    const cb = vi.fn();
    const unsub = nodeRef.current!.subscribeSlot("a", cb);
    nodeRef.current!.fill("a", 1);
    expect(cb).toHaveBeenLastCalledWith("filled");
    nodeRef.current!.consume("a");
    expect(cb).toHaveBeenLastCalledWith("empty");
    unsub();
  });

  it("fill on a non-empty slot throws", () => {
    const nodeRef = { current: null } as React.RefObject<NodeHandle | null>;
    render(<Harness slots={["a"]} nodeRef={nodeRef} />);
    nodeRef.current!.fill("a", 1);
    expect(() => nodeRef.current!.fill("a", 2)).toThrow(/while filled/);
  });

  it("requestConsume is a no-op when slot is empty", () => {
    const onConsume = vi.fn();
    const nodeRef = { current: null } as React.RefObject<NodeHandle | null>;
    render(<Harness slots={["a"]} onConsume={onConsume} nodeRef={nodeRef} />);
    nodeRef.current!.requestConsume("a");
    expect(onConsume).not.toHaveBeenCalled();
  });

  it("manual button is disarmed when slot is empty, arms on fill, invokes consume on click", () => {
    const nodeRef = { current: null } as React.RefObject<NodeHandle | null>;
    const { container } = render(
      <Harness slots={["slot"]} manualSlot="slot" nodeRef={nodeRef} />,
    );
    const btn = container.querySelector('[data-input-id="slot"]')!;
    expect(btn.getAttribute("data-armed")).toBe("false");
    act(() => { nodeRef.current!.fill("slot", 7); });
    expect(btn.getAttribute("data-armed")).toBe("true");
    act(() => { fireEvent.click(btn); });
    expect(btn.getAttribute("data-armed")).toBe("false");
    expect(nodeRef.current!.slotPhase("slot")).toBe("empty");
  });
});
