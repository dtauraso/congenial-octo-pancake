// Repro: simulate _handle-load with the actual topology.json from
// repo root and verify each stage. If any step throws, the empty
// diagram is explained.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseSpec } from "../../src/schema";
import { matchSubstrate } from "../../src/substrate/match";
import { startWiresRuntime, stopWiresRuntime, getWiresMap } from "../../src/substrate/runtime-wires";
import { specToFlow } from "../../src/webview/rf/adapter";

describe("handle-load repro on real topology.json", () => {
  it("parses, matches, builds wires, and produces flow", async () => {
    const text = readFileSync(resolve(__dirname, "../../../../topology.json"), "utf8");
    const raw = JSON.parse(text);
    const spec = parseSpec(raw);
    expect(spec.nodes.length).toBe(4);
    expect(spec.edges.length).toBe(3);

    const matched = matchSubstrate(spec);
    expect(matched).toBe(true);

    let runtimeError: unknown = null;
    try {
      await startWiresRuntime(spec);
    } catch (e) {
      runtimeError = e;
    }
    expect(runtimeError).toBeNull();

    const wires = getWiresMap();
    expect(wires?.size).toBe(3);

    const flow = specToFlow(spec, [], {});
    expect(flow.nodes.length).toBe(4);
    expect(flow.edges.length).toBe(3);

    await stopWiresRuntime();
  });
});
