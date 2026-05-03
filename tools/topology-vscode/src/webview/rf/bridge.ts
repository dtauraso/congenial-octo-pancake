// Renderer-agnostic shim. Legacy modules (views.ts, view.ts) call into here
// instead of touching the SVG directly; the React Flow app registers handlers
// at mount time. Keeps existing modules largely unchanged.

import type { Viewport } from "reactflow";

export type ViewBox = { x: number; y: number; w: number; h: number };

type Handlers = {
  setViewBox?: (vb: ViewBox) => void;
  getViewBox?: () => ViewBox;
  setDim?: (members: Set<string> | undefined) => void;
  onPanStart?: (fn: () => void) => void;
  getViewport?: () => Viewport;
  getSelectedNodeIds?: () => string[];
};

const h: Handlers = {};

export function register(part: Partial<Handlers>) {
  Object.assign(h, part);
}

export function applyViewBox(vb: ViewBox) { h.setViewBox?.(vb); }
export function currentViewBox(): ViewBox {
  return h.getViewBox?.() ?? { x: 0, y: 0, w: 0, h: 0 };
}
export function applyDim(members: Set<string> | undefined) { h.setDim?.(members); }
export function selectedNodeIds(): string[] { return h.getSelectedNodeIds?.() ?? []; }

const panStartListeners: Array<() => void> = [];
export function notifyPanStart() { for (const fn of panStartListeners) fn(); }
export function onPanStart(fn: () => void) { panStartListeners.push(fn); }
