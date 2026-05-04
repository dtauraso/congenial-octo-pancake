import { describe, expect, it } from "vitest";
import { sampleRidingKeyframes } from "../src/webview/rf/riding-keyframes";

describe("sampleRidingKeyframes", () => {
  // A 100-px straight line from (0,0) to (100,0) sampled at t in [0,1].
  const line = (t: number) => ({ x: t * 100, y: 0 });

  it("emits N frames bracketed by offset 0 and 1", () => {
    const frames = sampleRidingKeyframes(line, 5, 0);
    expect(frames).toHaveLength(5);
    expect(frames[0].offset).toBe(0);
    expect(frames[frames.length - 1].offset).toBe(1);
  });

  it("translates with the path point and applies y offset", () => {
    const frames = sampleRidingKeyframes(line, 3, -10);
    expect(frames[0].transform).toBe("translate(0px, -10px)");
    expect(frames[1].transform).toBe("translate(50px, -10px)");
    expect(frames[2].transform).toBe("translate(100px, -10px)");
  });

  it("fades in over first 5% and out over last 5%", () => {
    const frames = sampleRidingKeyframes(line, 21, 0);
    // offset 0 → opacity 0
    expect(frames[0].opacity).toBe(0);
    // offset 1 → opacity 0
    expect(frames[20].opacity).toBe(0);
    // offset 0.5 → fully opaque
    const mid = frames.find((f) => f.offset === 0.5)!;
    expect(mid.opacity).toBe(1);
  });

  it("rejects sample counts < 2", () => {
    expect(() => sampleRidingKeyframes(line, 1, 0)).toThrow();
  });
});
