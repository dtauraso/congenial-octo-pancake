// Tier 1 contract test: spec → React Flow nodes/edges → spec round-trips
// without losing fields. Fixtures live under test/fixtures/specs/. The
// "full-fields" fixture is expected to fail today (Phase 9 gap — adapter
// drops notes/route/lane/named handles); marked with `it.fails` so the
// suite stays green while keeping the gap visible as a tracked test.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseSpec, type Spec } from "../src/schema";
import { flowToSpec, specToFlow } from "../src/webview/rf/adapter";

const FIXTURE_DIR = join(__dirname, "fixtures", "specs");
const REPO_TOPOLOGY = join(__dirname, "..", "..", "..", "topology.json");

function loadFixture(name: string): Spec {
  return parseSpec(JSON.parse(readFileSync(join(FIXTURE_DIR, name), "utf8")));
}

function loadLive(): Spec {
  return parseSpec(JSON.parse(readFileSync(REPO_TOPOLOGY, "utf8")));
}

function roundTrip(spec: Spec): Spec {
  const flow = specToFlow(spec);
  return flowToSpec(flow.nodes, flow.edges);
}

describe("spec ↔ React Flow round-trip", () => {
  it("preserves a minimal 2-node spec", () => {
    const src = loadFixture("minimal.json");
    expect(roundTrip(src)).toEqual(src);
  });

  // State (dx/dy) now lives in view.nodes[id].state, not in spec.
  // The fixture no longer has state on nodes; the round-trip just checks
  // the spec fields survive intact.
  it("preserves state-motion fixture (state is view-only)", () => {
    const src = loadFixture("state-motion.json");
    expect(roundTrip(src)).toEqual(src);
  });

  // Phase 6 Chunk B: paused drag writes props.slidePx/slideDy. Round-trip
  // must preserve the props or a save-then-reload would erase the gesture.
  it("preserves node.props (slidePx/slideDy) for motion-bearing nodes", () => {
    const src = loadFixture("props-motion.json");
    expect(roundTrip(src)).toEqual(src);
  });

  it("preserves the live topology.json (basic fields)", () => {
    // Live spec uses a stripped subset — the adapter currently round-trips
    // exactly what topogen consumes. If this regresses, codegen drift
    // follows immediately.
    const src = loadLive();
    const round = roundTrip(src);
    expect(round.nodes.map((n) => n.id)).toEqual(src.nodes.map((n) => n.id));
    expect(round.edges.map((e) => e.id)).toEqual(src.edges.map((e) => e.id));
    for (const [i, n] of src.nodes.entries()) {
      expect(round.nodes[i].type).toBe(n.type);
    }
    for (const [i, e] of src.edges.entries()) {
      expect(round.edges[i].source).toBe(e.source);
      expect(round.edges[i].target).toBe(e.target);
      expect(round.edges[i].sourceHandle).toBe(e.sourceHandle);
      expect(round.edges[i].targetHandle).toBe(e.targetHandle);
      expect(round.edges[i].kind).toBe(e.kind);
    }
  });

  // round-trip contract: lane, valueLabel, arrowStyle, notes survive.
  // route is now view-only and not present in the spec fixture.
  it("preserves every field on the full-fields fixture", () => {
    const src = loadFixture("full-fields.json");
    expect(roundTrip(src)).toEqual(src);
  });
});
