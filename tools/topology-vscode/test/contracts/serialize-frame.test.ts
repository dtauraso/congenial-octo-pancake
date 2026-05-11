// Step 7a: pin the PacedFrame → FrameMsg serialization contract.
// The webview side parses FrameMsg via parseHostToWebview, so this
// test guards the wire format the future painter will rely on.

import { describe, expect, it } from "vitest";
import { serializeFrame } from "../../src/host-shim/serialize-frame";
import type { PacedFrame } from "../../src/host-shim/host-shim";
import { parseHostToWebview } from "../../src/messages";

describe("serializeFrame", () => {
  it("flattens wire and node maps into pair arrays in insertion order", () => {
    const frame: PacedFrame<number> = {
      seq: 7,
      wires: new Map([
        ["w1", { kind: "empty" }],
        ["w2", { kind: "loaded", value: 42 }],
      ]),
      nodes: new Map([
        ["n1", "running"],
        ["n2", "parked-output"],
      ]),
    };
    expect(serializeFrame(frame)).toEqual({
      type: "frame",
      seq: 7,
      wires: [
        ["w1", { kind: "empty" }],
        ["w2", { kind: "loaded", value: 42 }],
      ],
      nodes: [
        ["n1", "running"],
        ["n2", "parked-output"],
      ],
    });
  });

  it("round-trips through parseHostToWebview", () => {
    const frame: PacedFrame<string> = {
      seq: 1,
      wires: new Map([["w", { kind: "loaded", value: "v" }]]),
      nodes: new Map([["n", "parked-ack"]]),
    };
    const parsed = parseHostToWebview(serializeFrame(frame));
    expect(parsed?.type).toBe("frame");
    if (parsed?.type === "frame") {
      expect(parsed.seq).toBe(1);
      expect(parsed.wires).toEqual([["w", { kind: "loaded", value: "v" }]]);
      expect(parsed.nodes).toEqual([["n", "parked-ack"]]);
    }
  });

  it("empty frame produces empty pair arrays", () => {
    const frame: PacedFrame<number> = {
      seq: 0,
      wires: new Map(),
      nodes: new Map(),
    };
    expect(serializeFrame(frame)).toEqual({
      type: "frame",
      seq: 0,
      wires: [],
      nodes: [],
    });
  });
});
