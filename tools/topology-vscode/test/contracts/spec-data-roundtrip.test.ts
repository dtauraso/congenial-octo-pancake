// Contract C2 (docs/planning/visual-editor/contracts.md):
// spec → React Flow → spec round-trip preserves every edge's `data`
// field (slots, init, delay) and every node's `data` field. Editor
// saves go through this round-trip on every save, so any field the
// adapter strips here is silently lost from the on-disk spec.
//
// History: topology.json's missing `data.slots:1` on inputToReadGate
// (task/topology-spec-slots-1) would have been auto-stripped by the
// editor on any save before the spec-to-flow / flow-to-spec fix that
// landed alongside this test. This test pins the fix.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseSpec } from "../../src/schema";
import { flowToSpec, specToFlow } from "../../src/webview/rf/adapter";

const FIXTURE = join(__dirname, "..", "fixtures", "specs", "edge-data-roundtrip.json");

describe("contract C2: spec.data round-trip", () => {
  it("preserves edge.data.slots / .init / .delay and node.data through specToFlow → flowToSpec", () => {
    const src = parseSpec(JSON.parse(readFileSync(FIXTURE, "utf8")));
    const flow = specToFlow(src);
    const round = flowToSpec(flow.nodes, flow.edges);
    expect(round).toEqual(src);
  });
});
