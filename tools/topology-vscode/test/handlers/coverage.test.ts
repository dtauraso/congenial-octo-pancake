// Every input port of every node-type registry entry (except Input
// and Generic, which carry no handler) must have a registered handler.
// Plus: HANDLERS must not advertise any unknown node type.

import { describe, expect, it } from "vitest";
import { getHandler, HANDLERS } from "../../src/sim/handlers";
import { NODE_TYPES } from "../../src/schema";

describe("HANDLERS coverage", () => {
  it("covers every input port of every NODE_TYPES entry except Input/Generic", () => {
    for (const [type, def] of Object.entries(NODE_TYPES)) {
      if (type === "Input" || type === "Generic") continue;
      for (const port of def.inputs) {
        expect(getHandler(type, port.name), `${type}.${port.name}`).toBeDefined();
      }
    }
  });
});

describe("HANDLERS map", () => {
  it("exposes only known node types", () => {
    for (const t of Object.keys(HANDLERS)) {
      expect(NODE_TYPES[t], `unknown type ${t} in HANDLERS`).toBeDefined();
    }
  });
});
