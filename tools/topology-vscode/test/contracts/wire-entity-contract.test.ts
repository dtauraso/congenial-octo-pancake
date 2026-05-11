// Red contract test for the wire-as-entity model. Pins what MODEL.md
// says the wire IS, before any implementation lands. Three claims:
//
//   1. Wire state is exactly `empty | loaded(v) | taken(v)`. No queue,
//      no buffer, no length, no inFlight/idle. One value or none.
//   2. Geometry is cosmetic — geometry edits do not affect wire state.
//   3. Substrate source contains zero banned-vocabulary hits
//      (lint-style assertion via check-substrate-vocab.mjs).
//
// All three are expected RED at write time:
//   (1)+(2) import a not-yet-existing wire-entity module;
//   (3) currently has 10 baseline hits in legacy substrate files.
//
// Do not "fix" these by relaxing the assertions. The point is to pin
// the model so an implementation can be built against it.

import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

describe("Wire entity — state shape", () => {
  it("starts empty", async () => {
    const { createWire } = await import("../../src/substrate/wire-entity");
    const w = createWire("e1");
    expect(w.state).toEqual({ kind: "empty" });
  });

  it("transitions empty → loaded → taken → empty across load/take/ack", async () => {
    const { createWire } = await import("../../src/substrate/wire-entity");
    const w = createWire("e1");
    w.load(42);
    expect(w.state).toEqual({ kind: "loaded", value: 42 });
    w.take();
    expect(w.state).toEqual({ kind: "taken", value: 42 });
    w.ack();
    expect(w.state).toEqual({ kind: "empty" });
  });

  it("exposes no queue, buffer, length, or timing fields", async () => {
    const { createWire } = await import("../../src/substrate/wire-entity");
    const w = createWire("e1") as Record<string, unknown>;
    for (const banned of [
      "queue", "buffer", "pending", "inFlight", "ready", "length",
      "duration", "durationMs", "speed", "deadline", "scheduledAt",
    ]) {
      expect(w).not.toHaveProperty(banned);
    }
  });
});

describe("Wire entity — geometry independence", () => {
  it("wire state is unchanged when geometry hints are mutated", async () => {
    const { createWire } = await import("../../src/substrate/wire-entity");
    const w = createWire("e1");
    w.carry("v");
    const before = { ...w.state };
    // Geometry edits live on the renderer/view side; even if a wire
    // accepts cosmetic hints, mutating them must not perturb state.
    (w as Record<string, unknown>).pathLength = 999;
    (w as Record<string, unknown>).snakeRouting = true;
    expect(w.state).toEqual(before);
  });
});

describe("Substrate vocabulary — lint contract", () => {
  it("substrate/ contains zero banned-vocabulary hits", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const script = resolve(here, "../../scripts/check-substrate-vocab.mjs");
    let exitCode = 0;
    try {
      execFileSync("node", [script], { stdio: "pipe" });
    } catch (e) {
      exitCode = (e as { status?: number }).status ?? 1;
    }
    expect(exitCode).toBe(0);
  });
});
