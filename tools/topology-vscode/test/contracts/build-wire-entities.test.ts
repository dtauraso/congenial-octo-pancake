// Step 7b: pin the Spec → wire-entity map shape. One wire per edge,
// keyed by edge id, in edge-list order. Duplicate edge ids are a hard
// error (catches authoring bugs that would silently drop edges).

import { describe, expect, it } from "vitest";
import { buildWireEntities } from "../../src/substrate/build-wire-entities";
import type { Spec } from "../../src/schema";

const e = (id: string, src: string, tgt: string): Spec["edges"][number] => ({
  id, source: src, sourceHandle: "o", target: tgt, targetHandle: "i", kind: "signal",
});

const spec = (edges: Spec["edges"]): Spec => ({ nodes: [], edges });

describe("buildWireEntities", () => {
  it("creates one wire per edge keyed by edge id", () => {
    const map = buildWireEntities(spec([e("e1", "a", "b"), e("e2", "b", "c")]));
    expect(Array.from(map.keys())).toEqual(["e1", "e2"]);
    expect(map.get("e1")?.id).toBe("e1");
    expect(map.get("e1")?.state).toEqual({ kind: "empty" });
  });

  it("throws on duplicate edge ids", () => {
    expect(() =>
      buildWireEntities(spec([e("dup", "a", "b"), e("dup", "b", "c")])),
    ).toThrow(/duplicate edge id dup/);
  });

  it("returns an empty map for a spec with no edges", () => {
    expect(buildWireEntities(spec([])).size).toBe(0);
  });
});
