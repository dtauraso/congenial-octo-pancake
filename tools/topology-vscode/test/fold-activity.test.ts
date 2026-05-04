import { describe, expect, it } from "vitest";
import { isFoldBoundaryEmit, applyFoldBoundaryEmit } from "../src/webview/rf/fold-activity";

describe("isFoldBoundaryEmit", () => {
  const members = new Set(["a", "b", "c"]);
  it("true outside → member", () => { expect(isFoldBoundaryEmit(members, "x", "a")).toBe(true); });
  it("true member → outside", () => { expect(isFoldBoundaryEmit(members, "b", "y")).toBe(true); });
  it("false member → member", () => { expect(isFoldBoundaryEmit(members, "a", "b")).toBe(false); });
  it("false outside → outside", () => { expect(isFoldBoundaryEmit(members, "x", "y")).toBe(false); });
});

describe("applyFoldBoundaryEmit (halo accumulator)", () => {
  const members = new Set(["a", "b"]);

  it("inward emit increments", () => {
    expect(applyFoldBoundaryEmit(members, 0, "x", "a")).toBe(1);
  });

  it("outward emit decrements", () => {
    expect(applyFoldBoundaryEmit(members, 2, "b", "y")).toBe(1);
  });

  it("clamps at 0 — outward from 0 stays at 0 (emit-before-receive)", () => {
    expect(applyFoldBoundaryEmit(members, 0, "a", "y")).toBe(0);
  });

  it("internal emit is a no-op", () => {
    expect(applyFoldBoundaryEmit(members, 3, "a", "b")).toBe(3);
  });

  it("external emit is a no-op", () => {
    expect(applyFoldBoundaryEmit(members, 3, "x", "y")).toBe(3);
  });

  it("balanced in/out cycle returns to 0", () => {
    let n = 0;
    n = applyFoldBoundaryEmit(members, n, "x", "a"); // in
    n = applyFoldBoundaryEmit(members, n, "x", "b"); // in
    n = applyFoldBoundaryEmit(members, n, "a", "y"); // out
    n = applyFoldBoundaryEmit(members, n, "b", "y"); // out
    expect(n).toBe(0);
  });

  it("count > 1 while multiple pulses are inside", () => {
    let n = 0;
    n = applyFoldBoundaryEmit(members, n, "x", "a"); // 1
    n = applyFoldBoundaryEmit(members, n, "x", "b"); // 2
    expect(n).toBe(2);
    n = applyFoldBoundaryEmit(members, n, "a", "y"); // 1
    expect(n).toBe(1);
  });
});
