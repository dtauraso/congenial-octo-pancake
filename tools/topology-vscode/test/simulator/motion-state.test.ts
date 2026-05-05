// Motion-bearing handlers (Partition) propagate dx into world.state,
// which the renderer reads to drive node-position tweens. Pins the
// "simulator state IS the motion source — no separate keyframe track"
// contract Phase 6 Chunk A relies on.

import { describe, expect, it } from "vitest";
import { runToQuiescent } from "../../src/sim/simulator";
import type { Spec } from "../../src/schema";
import { edge } from "./_helpers";

describe("simulator: motion-bearing state (Phase 6 Chunk A)", () => {
  it("Partition phase advances accumulate dx in world.state", () => {
    const spec: Spec = {
      nodes: [
        { id: "src", type: "Input", x: 0, y: 0 },
        { id: "p", type: "Partition", x: 0, y: 0 },
      ],
      edges: [edge("srcToP", "src", "out", "p", "in", "chain")],
      timing: {
        seed: [
          { nodeId: "src", outPort: "out", value: 1, atTick: 0 },
          { nodeId: "src", outPort: "out", value: 1, atTick: 1 },
        ],
      },
    };
    const final = runToQuiescent(spec);
    // Default slidePx=30; two transitions → dx=60.
    expect(final.state.p.dx).toBe(60);
  });
});
