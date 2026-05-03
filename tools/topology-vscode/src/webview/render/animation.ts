import { KIND_COLORS, NODE_TYPES, type Edge, type Node } from "../../schema";
import { type EdgeGeom, edgeGeom, pathLength } from "../geom";
import { SVG_NS, animationLayer, spec } from "../state";

type StateReg = {
  el: SVGTextElement;
  field: string;
  segments: { t: number; v: string }[];
};

const stateRegistry: StateReg[] = [];
let rafId = 0;

export function registerStateText(reg: StateReg) {
  stateRegistry.push(reg);
}

export function resetAnimations() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  stateRegistry.length = 0;
  if (animationLayer) animationLayer.replaceChildren();
}

function parseDur(s: string | undefined): number {
  if (!s) return 27000;
  if (s.endsWith("ms")) return parseFloat(s);
  if (s.endsWith("s")) return parseFloat(s) * 1000;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 27000;
}

export function renderAnimation() {
  const durMs = parseDur(spec.timing!.duration);
  const steps = spec.timing!.steps;
  const fireTimes = new Map<string, number[]>();
  const departAt = new Map<string, number>();
  const arriveAt = new Map<string, number>();
  for (const s of steps) {
    if (s.fires) for (const id of s.fires) {
      const arr = fireTimes.get(id) ?? [];
      arr.push(s.t);
      fireTimes.set(id, arr);
    }
    if (s.departs) for (const id of s.departs) departAt.set(id, s.t);
    if (s.arrives) for (const id of s.arrives) arriveAt.set(id, s.t);
  }

  for (const [nodeId, ts] of fireTimes) {
    const n = spec.nodes.find((x) => x.id === nodeId);
    if (!n) continue;
    buildNodeFlash(n, ts, durMs);
  }

  for (const e of spec.edges) {
    const td = departAt.get(e.id);
    const ta = arriveAt.get(e.id);
    if (td === undefined || ta === undefined || ta <= td) continue;
    const g = edgeGeom(e);
    if (!g) continue;
    buildEdgePulse(e, g, td, ta, durMs);
  }

  if (stateRegistry.length) startStateRaf(durMs);
}

function buildNodeFlash(n: Node, ts: number[], durMs: number) {
  const def = NODE_TYPES[n.type] ?? NODE_TYPES.Generic;
  const rect = document.createElementNS(SVG_NS, "rect");
  rect.setAttribute("x", String(n.x));
  rect.setAttribute("y", String(n.y));
  rect.setAttribute("width", String(def.width));
  rect.setAttribute("height", String(def.height));
  rect.setAttribute("rx", def.shape === "pill" ? "20" : "6");
  rect.setAttribute("fill", "white");
  rect.setAttribute("stroke", "none");
  rect.setAttribute("opacity", "0");
  animationLayer.appendChild(rect);

  const sorted = [...ts].sort((a, b) => a - b);
  const flashHalfWidth = 0.015;
  const intervals: Array<[number, number]> = [];
  for (const t of sorted) {
    const t0 = Math.max(0, t - flashHalfWidth);
    const t1 = Math.min(1, t + flashHalfWidth);
    const last = intervals[intervals.length - 1];
    if (last && t0 <= last[1]) last[1] = Math.max(last[1], t1);
    else intervals.push([t0, t1]);
  }
  const keyframes: Keyframe[] = [{ opacity: 0, offset: 0 }];
  for (const [t0, t1] of intervals) {
    const lastOff = keyframes[keyframes.length - 1].offset as number;
    if (t0 > lastOff) keyframes.push({ opacity: 0, offset: t0 });
    const peak = (t0 + t1) / 2;
    if (peak > (keyframes[keyframes.length - 1].offset as number)) {
      keyframes.push({ opacity: 0.5, offset: peak });
    }
    if (t1 > (keyframes[keyframes.length - 1].offset as number)) {
      keyframes.push({ opacity: 0, offset: t1 });
    }
  }
  if ((keyframes[keyframes.length - 1].offset as number) < 1) {
    keyframes.push({ opacity: 0, offset: 1 });
  }
  rect.animate(keyframes, { duration: durMs, iterations: Infinity });
}

function buildEdgePulse(e: Edge, g: EdgeGeom, td: number, ta: number, durMs: number) {
  const stroke = KIND_COLORS[e.kind] ?? "#888";
  const len = pathLength(g);
  let pulse: SVGElement;
  if (g.kind === "line") {
    pulse = document.createElementNS(SVG_NS, "line");
    pulse.setAttribute("x1", String(g.x1));
    pulse.setAttribute("y1", String(g.y1));
    pulse.setAttribute("x2", String(g.x2));
    pulse.setAttribute("y2", String(g.y2));
  } else {
    pulse = document.createElementNS(SVG_NS, "path");
    pulse.setAttribute("d", g.d);
    pulse.setAttribute("fill", "none");
  }
  pulse.setAttribute("stroke", stroke);
  pulse.setAttribute("stroke-width", "3");
  pulse.setAttribute("stroke-dasharray", "20,9999");
  pulse.setAttribute("stroke-dashoffset", "0");
  pulse.setAttribute("opacity", "0");
  animationLayer.appendChild(pulse);

  const eps = 0.001;
  const tdLow = Math.max(0, td - eps);
  const taHigh = Math.min(1, ta + eps);
  pulse.animate(
    [
      { strokeDashoffset: "0", opacity: 0, offset: 0 },
      { strokeDashoffset: "0", opacity: 0, offset: tdLow },
      { strokeDashoffset: "0", opacity: 1, offset: td },
      { strokeDashoffset: `${-len}`, opacity: 1, offset: ta },
      { strokeDashoffset: `${-len}`, opacity: 0, offset: taHigh },
      { strokeDashoffset: `${-len}`, opacity: 0, offset: 1 },
    ],
    { duration: durMs, iterations: Infinity }
  );
}

function startStateRaf(durMs: number) {
  const start = performance.now();
  const tick = (now: number) => {
    const t = ((now - start) % durMs) / durMs;
    for (const r of stateRegistry) {
      let cur = r.segments[0].v;
      for (const s of r.segments) {
        if (s.t <= t) cur = s.v;
        else break;
      }
      const want = `${r.field}=${cur}`;
      if (r.el.textContent !== want) r.el.textContent = want;
    }
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}
