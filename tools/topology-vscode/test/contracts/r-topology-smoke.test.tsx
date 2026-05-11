// @vitest-environment happy-dom
//
// End-to-end smoke test for the new substrate primitives. Mounts the
// TopologyRoot harness and exercises one full cycle: source loads
// wire, destination button arms, click → take, source acks, round
// closes, tick advances.

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";

afterEach(cleanup);
import { TopologyRoot } from "../../src/webview/substrate-r/TopologyRoot";

beforeAll(() => {
  // happy-dom doesn't implement getPointAtLength on SVGPathElement; the
  // wire's animation effect calls it inside RAF. Stub a fixed point so
  // the RAF loop doesn't throw. Animation correctness is not under
  // test here — substrate plumbing is.
  if (!("getPointAtLength" in SVGPathElement.prototype)) {
    Object.defineProperty(SVGPathElement.prototype, "getPointAtLength", {
      value: () => ({ x: 0, y: 0 }),
      configurable: true,
    });
  }
});

describe("TopologyRoot end-to-end", () => {
  it("source loads wire on step → button arms → click takes → tick advances", () => {
    const { getByTestId, container } = render(
      <TopologyRoot initialQueue={[42]} haltedOnMount />,
    );
    expect(getByTestId("tick").textContent).toBe("tick: 0");
    expect(getByTestId("halted").textContent).toBe("halted");

    // Step: source.run() loads wire(42). Round in flight (wire loaded).
    act(() => { fireEvent.click(getByTestId("step")); });

    // Round did not close (destination is manual-take, wire still loaded).
    expect(getByTestId("tick").textContent).toBe("tick: 0");

    // Manual-take button is armed.
    const btn = container.querySelector('[data-input-id="in"]')!;
    expect(btn.getAttribute("data-armed")).toBe("true");

    // Click the armed button → wire.take() → source's subscription
    // → wire.ack() → wire empty → driver observes round close.
    act(() => { fireEvent.click(btn); });

    expect(getByTestId("tick").textContent).toBe("tick: 1");
    expect(btn.getAttribute("data-armed")).toBe("false");
  });

  it("subsequent step emits next value from the queue", () => {
    const { getByTestId, container } = render(
      <TopologyRoot initialQueue={[1, 2]} haltedOnMount />,
    );
    act(() => { fireEvent.click(getByTestId("step")); });
    const btn = container.querySelector('[data-input-id="in"]')!;
    expect(btn.getAttribute("data-armed")).toBe("true");
    act(() => { fireEvent.click(btn); });
    expect(getByTestId("tick").textContent).toBe("tick: 1");

    act(() => { fireEvent.click(getByTestId("step")); });
    expect(btn.getAttribute("data-armed")).toBe("true");
    act(() => { fireEvent.click(btn); });
    expect(getByTestId("tick").textContent).toBe("tick: 2");
  });

  it("queue exhaustion: step after empty queue still advances tick (no-op round)", () => {
    const { getByTestId, container } = render(
      <TopologyRoot initialQueue={[1]} haltedOnMount />,
    );
    act(() => { fireEvent.click(getByTestId("step")); });
    const btn = container.querySelector('[data-input-id="in"]')!;
    act(() => { fireEvent.click(btn); });
    expect(getByTestId("tick").textContent).toBe("tick: 1");

    // Queue empty. step() runs source, source loads nothing, all wires
    // stay empty, driver closes round immediately.
    act(() => { fireEvent.click(getByTestId("step")); });
    expect(getByTestId("tick").textContent).toBe("tick: 2");
    expect(btn.getAttribute("data-armed")).toBe("false");
  });
});
