// Shared spec factories for integration test suite.
// Each factory returns a valid RTopologySpec ready to pass to TopologyRoot.
//
// All wires default to arcLength: 0, which collapses visible duration to one RAF tick
// while preserving control-flow event ordering. This keeps tests deterministic under
// fake timers without changing the substrate's timing model.

import type { RTopologySpec, RWireSpec } from "../../src/webview/substrate-r/spec";

const PATH = "M 0 0 L 100 0";

function wire(
  id: string, srcId: string, srcPort: string, tgtId: string, tgtPort: string,
  extra: Partial<RWireSpec> = {},
): RWireSpec {
  return { id, source: { nodeId: srcId, port: srcPort }, target: { nodeId: tgtId, port: tgtPort }, pathD: PATH, arcLength: 0, ...extra };
}

/** Linear chain: input(queue) → relay → readgate */
export function chain(queue: unknown[]): RTopologySpec {
  return {
    nodes: [
      { id: "src", kind: "input", props: { queue } },
      { id: "r", kind: "relay" },
      { id: "gate", kind: "readgate" },
    ],
    wires: [
      wire("w1", "src", "out", "r", "slot"),
      wire("w2", "r", "out", "gate", "slot"),
    ],
  };
}

/**
 * Two CI→IRG lanes with cross-wired inhibitOut for lateral cascade (C1).
 * Lane A has a direct path; lane B is delayed by an extra relay hop so A
 * always wins the race. ci_A fires first, sends inhibitOut → irg_B.right
 * before ci_B.out arrives at irg_B.left. Result: irg_A fires, irg_B silenced.
 * Each IRG has a downstream readgate so `trace.inhibitrightgate.fire` is emitted.
 */
export function lateralCascade(): RTopologySpec {
  return {
    nodes: [
      { id: "srcA",      kind: "input",            props: { queue: [1] } },
      { id: "srcB",      kind: "input",            props: { queue: [1] } },
      { id: "delayB",    kind: "relay" },
      { id: "ci_A",      kind: "chaininhibitor" },
      { id: "ci_B",      kind: "chaininhibitor" },
      { id: "irg_A",     kind: "inhibitrightgate" },
      { id: "irg_B",     kind: "inhibitrightgate" },
      { id: "gate_A",    kind: "readgate" },
      { id: "gate_B",    kind: "readgate" },
    ],
    wires: [
      wire("wA_in",       "srcA",   "out",        "ci_A",   "in"),
      wire("wB_delay",    "srcB",   "out",        "delayB", "slot"),
      wire("wB_in",       "delayB", "out",        "ci_B",   "in"),
      wire("wA_out",      "ci_A",   "out",        "irg_A",  "left"),
      wire("wB_out",      "ci_B",   "out",        "irg_B",  "left"),
      wire("wA_inhibit",  "ci_A",   "inhibitOut", "irg_B",  "right"),
      wire("wB_inhibit",  "ci_B",   "inhibitOut", "irg_A",  "right"),
      wire("wA_irg_out",  "irg_A",  "out",        "gate_A", "slot"),
      wire("wB_irg_out",  "irg_B",  "out",        "gate_B", "slot"),
    ],
  };
}

/** Single CI lane: input → CI → relay (no inhibitOut wired). */
export function ciSoloChain(queue: unknown[]): RTopologySpec {
  return {
    nodes: [
      { id: "src", kind: "input", props: { queue } },
      { id: "ci",  kind: "chaininhibitor" },
      { id: "relay", kind: "relay" },
    ],
    wires: [
      wire("w_in",  "src",  "out",        "ci",    "in"),
      wire("w_out", "ci",   "out",        "relay", "slot"),
    ],
  };
}

/** CI with both out and inhibitOut wired (B1/B2). */
export function ciFanOut(queue: unknown[], inhibitSeed?: unknown): RTopologySpec {
  const wires: RWireSpec[] = [
    wire("w_in",      "src",  "out",        "ci",      "in"),
    wire("w_out",     "ci",   "out",        "relay_out","slot"),
    wire("w_inhibit", "ci",   "inhibitOut", "relay_inh","slot", inhibitSeed !== undefined ? { seed: inhibitSeed } : {}),
  ];
  return {
    nodes: [
      { id: "src",       kind: "input",         props: { queue } },
      { id: "ci",        kind: "chaininhibitor" },
      { id: "relay_out", kind: "relay" },
      { id: "relay_inh", kind: "relay" },
    ],
    wires,
  };
}
