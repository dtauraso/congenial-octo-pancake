// Sample WAAPI keyframes for a value label that rides alongside the
// pulse dot, mirroring the SVG-style co-animated text in
// diagrams/topology-animated.svg. The dot uses the
// stroke-dashoffset trick which doesn't apply to <text>, so we
// pre-compute transform keyframes from N path samples and let WAAPI
// interpolate.
//
// `getPoint` is the path's `getPointAtLength`, but parameterized as
// 0..1 so this stays a pure function and is unit-testable without a
// browser SVG implementation.

export type RidingKeyframe = { transform: string; opacity: number; offset: number };

export function sampleRidingKeyframes(
  getPoint: (t: number) => { x: number; y: number },
  samples: number,
  yOffset: number,
): RidingKeyframe[] {
  if (samples < 2) throw new Error("need at least 2 samples");
  const frames: RidingKeyframe[] = [];
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    const p = getPoint(t);
    // Fade in over the first 5% and out over the last 5%, mirroring
    // the dot's `0..0.95..1` opacity envelope so the two elements
    // share the same visual lifecycle.
    const opacity = t < 0.05 ? t / 0.05 : t > 0.95 ? (1 - t) / 0.05 : 1;
    frames.push({
      transform: `translate(${p.x}px, ${p.y + yOffset}px)`,
      opacity,
      offset: t,
    });
  }
  return frames;
}
