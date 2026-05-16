// @vitest-environment happy-dom
//
// B1: CI with both out and inhibitOut wired. Single pulse; after flush
//     both downstream relay in0 slots filled.

import { createRef } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { TopologyRoot, type TopologyRootHandle } from "../../src/webview/substrate-r/TopologyRoot";
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
