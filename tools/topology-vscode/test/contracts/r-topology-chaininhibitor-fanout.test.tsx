// @vitest-environment happy-dom
//
// B1: CI with both out and inhibitOut wired. Single pulse; after flush
//     both downstream relay in0 slots filled.
//
// B2: CI with inhibitOut → relay whose in0 is pre-seeded (slot already filled).
//     CI cannot fire: its inhibitOut wire can't accept (dest slot filled).
//     ci.in slot stays filled (input was received but CI blocked).

import { createRef } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { TopologyRoot, type TopologyRootHandle } from "../../src/webview/substrate-r/TopologyRoot";
import type { RTopologySpec } from "../../src/webview/substrate-r/spec";
import { patchSVG, flushRaf } from "./_harness";
import { ciFanOut } from "./_fixtures";

vi.mock("../../src/webview/log/post", () => ({
  postLog: vi.fn(),
}));

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers(); });
beforeAll(() => { patchSVG(); });

function flush(n = 6): void { for (let i = 0; i < n; i++) flushRaf(); }

describe("B1: CI fan-out — both out and inhibitOut wired", () => {
  it("single input pulse fills both downstream relay slots", () => {
    const ref = createRef<TopologyRootHandle>();
    render(<TopologyRoot ref={ref} spec={ciFanOut([1])} />);
    flush();

    expect(ref.current!.node("relay_out")!.slotPhase("in0")).toBe("filled");
    expect(ref.current!.node("relay_inh")!.slotPhase("in0")).toBe("filled");
  });
});

describe("B2: CI blocked when inhibitOut dest slot pre-seeded", () => {
  it("CI does not consume its in slot when inhibitOut wire cannot accept", () => {
    const ref = createRef<TopologyRootHandle>();
    // seed=1 on the inhibit wire: relay_inh.in0 fills on mount, blocking the wire
    const spec: RTopologySpec = {
      nodes: [
        { id: "src",       kind: "input",         props: { queue: [99] } },
        { id: "ci",        kind: "chaininhibitor" },
        { id: "relay_out", kind: "relay" },
        { id: "relay_inh", kind: "relay" },
      ],
      wires: [
        { id: "w_in",      source: { nodeId: "src",       port: "out"       }, target: { nodeId: "ci",        port: "in"  }, pathD: "M 0 0 L 100 0",   arcLength: 0 },
        { id: "w_out",     source: { nodeId: "ci",        port: "out"       }, target: { nodeId: "relay_out", port: "in0" }, pathD: "M 100 0 L 200 0", arcLength: 0 },
        { id: "w_inhibit", source: { nodeId: "ci",        port: "inhibitOut"}, target: { nodeId: "relay_inh", port: "in0" }, pathD: "M 100 50 L 200 50", arcLength: 0, seed: 1 },
      ],
    };
    render(<TopologyRoot ref={ref} spec={spec} />);
    flush();

    // relay_inh.in0 was pre-seeded: CI inhibitOut wire cannot accept.
    // CI cannot fire → ci.in stays filled (value received but not consumed).
    expect(ref.current!.node("ci")!.slotPhase("in")).toBe("filled");
    // relay_inh.in0 still holds the seed value (never consumed)
    expect(ref.current!.node("relay_inh")!.slotPhase("in0")).toBe("filled");
    // relay_out.in0 stays empty (CI didn't fire)
    expect(ref.current!.node("relay_out")!.slotPhase("in0")).toBe("empty");
  });
});
