// @vitest-environment happy-dom
//
// Locks the editor pulse path: a readgate whose schema input port is
// not "in0". Regression guard for the chainIn/in0 mismatch that
// crashed the driver mid-step before ef5db1a (slotId now threaded
// from the spec's port name into the body).

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { TopologyRoot } from "../../src/webview/substrate-r/TopologyRoot";
import type { RTopologySpec } from "../../src/webview/substrate-r/spec";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers(); });
beforeAll(() => {
  if (!("getPointAtLength" in SVGPathElement.prototype)) {
    Object.defineProperty(SVGPathElement.prototype, "getPointAtLength", {
      value: () => ({ x: 0, y: 0 }), configurable: true,
    });
  }
});

function makeSpec(slot: string, queue: unknown[]): RTopologySpec {
  return {
    nodes: [
      { id: "src", kind: "input", props: { queue } },
      { id: "gate", kind: "readgate", ports: { inputs: [slot] } },
    ],
    wires: [{
      id: "w0",
      source: { nodeId: "src", port: "out" },
      target: { nodeId: "gate", port: slot },
      pathD: "M 0 0 L 100 0",
      arcLength: 0,
    }],
  };
}

function flushRaf() { act(() => { vi.advanceTimersByTime(50); }); }

describe("readgate with non-in0 schema port", () => {
  it("wire arrives → slot 'chainIn' fills without error", () => {
    expect(() => {
      render(<TopologyRoot spec={makeSpec("chainIn", [42])} />);
      flushRaf();
    }).not.toThrow();
  });

  it("parseSpec rejects a wire whose target.port doesn't name the overridden slot", () => {
    const spec: RTopologySpec = {
      nodes: [
        { id: "src", kind: "input", props: { queue: [1] } },
        { id: "gate", kind: "readgate", ports: { inputs: ["chainIn"] } },
      ],
      wires: [{
        id: "w0",
        source: { nodeId: "src", port: "out" },
        target: { nodeId: "gate", port: "in0" },
        pathD: "M 0 0 L 100 0",
        arcLength: 0,
      }],
    };
    expect(() => render(<TopologyRoot spec={spec} />))
      .toThrow(/not a slot on readgate/);
  });
});
