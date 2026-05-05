import { describe, expect, it } from "vitest";
import { isFoldBoundaryEmit } from "../src/webview/rf/fold-activity";

describe("isFoldBoundaryEmit", () => {
  const members = new Set(["a", "b", "c"]);
  it("true outside → member", () => { expect(isFoldBoundaryEmit(members, "x", "a")).toBe(true); });
  it("true member → outside", () => { expect(isFoldBoundaryEmit(members, "b", "y")).toBe(true); });
  it("false member → member", () => { expect(isFoldBoundaryEmit(members, "a", "b")).toBe(false); });
  it("false outside → outside", () => { expect(isFoldBoundaryEmit(members, "x", "y")).toBe(false); });
});
