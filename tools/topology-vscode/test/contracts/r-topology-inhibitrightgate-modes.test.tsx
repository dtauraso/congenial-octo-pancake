// @vitest-environment happy-dom
//
// A6: L-alone — input→IRG.left (no R wire). IRG fires (trace + downstream).
// A7: R-only  — input→IRG.right (no L wire). IRG.right drains; no fire trace.
// A8: Both    — both slots filled. Both drain; no fire trace.

import { createRef } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { TopologyRoot, type TopologyRootHandle } from "../../src/webview/substrate-r/TopologyRoot";
import type { RTopologySpec } from "../../src/webview/substrate-r/spec";
import { patchSVG, flushRaf } from "./_harness";

vi.mock("../../src/webview/log/post", () => ({
  postLog: vi.fn(),
}));

import { postLog } from "../../src/webview/log/post";

afterEach(() => { cleanup(); vi.useRealTimers(); vi.mocked(postLog).mockClear(); });
beforeEach(() => { vi.useFakeTimers(); });
beforeAll(() => { patchSVG(); });

function flush(n = 6): void { for (let i = 0; i < n; i++) flushRaf(); }

function hasFire(nodeId: string): boolean {
  return vi.mocked(postLog).mock.calls.some(
    ([lbl, d]) => lbl === "trace.inhibitrightgate.fire" && d?.["node"] === nodeId,
  );
}

// A6: left only — IRG fires
describe("A6: IRG left-alone fires", () => {
  it("IRG emits fire trace and fills downstream when only left wired", () => {
    const ref = createRef<TopologyRootHandle>();
    const spec: RTopologySpec = {
      nodes: [
        { id: "src",   kind: "input",            props: { queue: [1] } },
        { id: "irg",   kind: "inhibitrightgate" },
        { id: "relay", kind: "relay" },
      ],
      wires: [
        { id: "w1", source: { nodeId: "src", port: "out"   }, target: { nodeId: "irg",   port: "left" }, pathD: "M 0 0 L 100 0",   arcLength: 0 },
        { id: "w2", source: { nodeId: "irg", port: "out"   }, target: { nodeId: "relay", port: "slot"  }, pathD: "M 100 0 L 200 0", arcLength: 0 },
      ],
    };
    render(<TopologyRoot ref={ref} spec={spec} />);
    flush();

    expect(hasFire("irg")).toBe(true);
    expect(ref.current!.node("relay")!.slotPhase("slot")).toBe("filled");
  });
});

// A7: right only — IRG drains right, no fire
describe("A7: IRG right-only drains silently", () => {
  it("IRG.right returns to empty; no fire trace emitted", () => {
    const ref = createRef<TopologyRootHandle>();
    const spec: RTopologySpec = {
      nodes: [
        { id: "src", kind: "input",            props: { queue: [1] } },
        { id: "irg", kind: "inhibitrightgate" },
      ],
      wires: [
        { id: "w1", source: { nodeId: "src", port: "out" }, target: { nodeId: "irg", port: "right" }, pathD: "M 0 0 L 100 0", arcLength: 0 },
      ],
    };
    render(<TopologyRoot ref={ref} spec={spec} />);
    flush();

    expect(hasFire("irg")).toBe(false);
    expect(ref.current!.node("irg")!.slotPhase("right")).toBe("empty");
  });
});

// A8: both filled — both drain, no fire
describe("A8: IRG both-filled drains silent", () => {
  it("both slots end empty; no fire trace", () => {
    const ref = createRef<TopologyRootHandle>();
    const spec: RTopologySpec = {
      nodes: [
        { id: "srcL", kind: "input",            props: { queue: [1] } },
        { id: "srcR", kind: "input",            props: { queue: [1] } },
        { id: "irg",  kind: "inhibitrightgate" },
      ],
      wires: [
        { id: "wL", source: { nodeId: "srcL", port: "out" }, target: { nodeId: "irg", port: "left"  }, pathD: "M 0 0 L 100 0",  arcLength: 0 },
        { id: "wR", source: { nodeId: "srcR", port: "out" }, target: { nodeId: "irg", port: "right" }, pathD: "M 0 50 L 100 50", arcLength: 0 },
      ],
    };
    render(<TopologyRoot ref={ref} spec={spec} />);
    flush();

    expect(hasFire("irg")).toBe(false);
    expect(ref.current!.node("irg")!.slotPhase("left")).toBe("empty");
    expect(ref.current!.node("irg")!.slotPhase("right")).toBe("empty");
  });
});
