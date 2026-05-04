// Tier 2 retro: legacy {x,y,w,h} viewBox cameras must convert to React
// Flow {x,y,zoom} viewports such that the framed center and visible extent
// survive the migration. The reverse direction is also locked down so the
// stored sidecar shape can flip between formats without losing meaning.

import { describe, expect, it } from "vitest";
import { boxToViewport, viewportToBox, type ViewBox } from "../src/webview/rf/camera";

const W = 800;
const H = 600;

type Case = { name: string; box: ViewBox; vp: { x: number; y: number; zoom: number } };

const cases: Case[] = [
  {
    name: "viewport-sized box maps to identity zoom centred at origin",
    box: { x: -W / 2, y: -H / 2, w: W, h: H },
    vp: { x: W / 2, y: H / 2, zoom: 1 },
  },
  {
    name: "double-size box halves zoom",
    box: { x: -W, y: -H, w: 2 * W, h: 2 * H },
    vp: { x: W / 2, y: H / 2, zoom: 0.5 },
  },
  {
    name: "non-square box uses min(W/w, H/h)",
    box: { x: 0, y: 0, w: 1600, h: 600 },
    vp: { x: W / 2 - 800 * 0.5, y: H / 2 - 300 * 0.5, zoom: 0.5 },
  },
  {
    name: "translated box keeps the centre framed",
    box: { x: 100, y: 200, w: W, h: H },
    vp: { x: W / 2 - (100 + W / 2) * 1, y: H / 2 - (200 + H / 2) * 1, zoom: 1 },
  },
];

describe("camera conversion", () => {
  for (const c of cases) {
    it(c.name, () => {
      const got = boxToViewport(c.box, W, H);
      expect(got.zoom).toBeCloseTo(c.vp.zoom, 6);
      expect(got.x).toBeCloseTo(c.vp.x, 6);
      expect(got.y).toBeCloseTo(c.vp.y, 6);
    });
  }

  it("viewportToBox is the inverse of boxToViewport for square boxes", () => {
    for (const c of cases.filter((x) => x.box.w / x.box.h === W / H)) {
      const round = viewportToBox(boxToViewport(c.box, W, H), W, H);
      expect(round.x).toBeCloseTo(c.box.x, 6);
      expect(round.y).toBeCloseTo(c.box.y, 6);
      expect(round.w).toBeCloseTo(c.box.w, 6);
      expect(round.h).toBeCloseTo(c.box.h, 6);
    }
  });
});
