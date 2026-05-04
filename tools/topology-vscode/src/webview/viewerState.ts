// Viewer state — sidecar to topology.json. None of these fields belong in the
// spec; topogen ignores them entirely. See visual-editor-plan.md §"Spec vs
// viewer state" for the policy.

// Canonical camera is React Flow's pan/zoom: `{x, y, zoom}`. The lit-html
// era persisted an SVG viewBox `{x, y, w, h}`; we still read those on load
// and migrate to canonical on the next save, but never write the legacy
// shape ourselves.
export type Camera = { x: number; y: number; zoom: number };
export type LegacyCameraBox = { x: number; y: number; w: number; h: number };

export function isLegacyCamera(c: Camera | LegacyCameraBox): c is LegacyCameraBox {
  return typeof (c as Camera).zoom !== "number";
}

export type SavedView = {
  name: string;
  // Legacy field — older sidecars captured the camera at save time. New
  // saves omit it; clicking a view frames its members via RF fitView.
  viewport?: { x: number; y: number; w: number; h: number };
  nodeIds: string[];
};

export type Fold = {
  id: string;
  label: string;
  memberIds: string[];
  position: [number, number];
  collapsed: boolean;
};

// Phase 5.5 Chunk D: bookmarks are now resumption coordinates, not
// timeline scrubber positions. Click → simulator.replayTo(cycle) with
// `startNodeId` as the active node, then hand off to the step-debugger
// in N2-paused state. Legacy `{name, t}` bookmarks are dropped on
// load (no migration — the global clock they referenced no longer
// exists).
export type Bookmark = { name: string; startNodeId: string; cycle: number };

export type ViewerState = {
  camera?: Camera | LegacyCameraBox;
  views?: SavedView[];
  folds?: Fold[];
  bookmarks?: Bookmark[];
  lastSelectionIds?: string[];
};

export const DEFAULT_VIEWER_STATE: ViewerState = {};

const isObj = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

const isStr = (v: unknown): v is string => typeof v === "string";

const isStrArr = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every(isStr);

function parseCamera(v: unknown): Camera | LegacyCameraBox | undefined {
  if (!isObj(v)) return undefined;
  if (!isNum(v.x) || !isNum(v.y)) return undefined;
  // Canonical takes precedence; old transitional sidecars wrote `{x,y,w:0,h:0,zoom}`
  // and the canonical branch correctly ignores the zeroed w/h.
  if (isNum(v.zoom)) return { x: v.x, y: v.y, zoom: v.zoom };
  if (isNum(v.w) && isNum(v.h) && v.w > 0 && v.h > 0) {
    return { x: v.x, y: v.y, w: v.w, h: v.h };
  }
  return undefined;
}

function parseSavedView(v: unknown): SavedView | undefined {
  if (!isObj(v)) return undefined;
  if (!isStr(v.name) || !isStrArr(v.nodeIds)) return undefined;
  const out: SavedView = { name: v.name, nodeIds: v.nodeIds };
  if (isObj(v.viewport) && isNum(v.viewport.x) && isNum(v.viewport.y) &&
      isNum(v.viewport.w) && isNum(v.viewport.h)) {
    out.viewport = { x: v.viewport.x, y: v.viewport.y, w: v.viewport.w, h: v.viewport.h };
  }
  return out;
}

function parseFold(v: unknown): Fold | undefined {
  if (!isObj(v)) return undefined;
  if (!isStr(v.id) || !isStr(v.label) || !isStrArr(v.memberIds)) return undefined;
  if (!Array.isArray(v.position) || v.position.length !== 2 ||
      !isNum(v.position[0]) || !isNum(v.position[1])) return undefined;
  if (typeof v.collapsed !== "boolean") return undefined;
  return {
    id: v.id, label: v.label, memberIds: v.memberIds,
    position: [v.position[0], v.position[1]], collapsed: v.collapsed,
  };
}

function parseBookmark(v: unknown): Bookmark | undefined {
  if (!isObj(v) || !isStr(v.name)) return undefined;
  if (!isStr(v.startNodeId) || !isNum(v.cycle)) return undefined;
  return { name: v.name, startNodeId: v.startNodeId, cycle: v.cycle };
}

function collect<T>(v: unknown, parse: (x: unknown) => T | undefined): T[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: T[] = [];
  for (const item of v) {
    const p = parse(item);
    if (p) out.push(p);
  }
  return out;
}

export function parseViewerState(text: string | undefined): ViewerState {
  if (!text) return { ...DEFAULT_VIEWER_STATE };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    console.warn("topology.view.json: invalid JSON, ignoring sidecar", err);
    return { ...DEFAULT_VIEWER_STATE };
  }
  if (!isObj(raw)) {
    console.warn("topology.view.json: top-level value is not an object, ignoring");
    return { ...DEFAULT_VIEWER_STATE };
  }
  const out: ViewerState = {};
  if (raw.camera !== undefined) {
    const cam = parseCamera(raw.camera);
    if (cam) out.camera = cam;
    else console.warn("topology.view.json: dropping malformed camera");
  }
  if (raw.views !== undefined) {
    const views = collect(raw.views, parseSavedView);
    if (views) out.views = views;
    else console.warn("topology.view.json: views is not an array, dropping");
  }
  if (raw.folds !== undefined) {
    const folds = collect(raw.folds, parseFold);
    if (folds) out.folds = folds;
    else console.warn("topology.view.json: folds is not an array, dropping");
  }
  if (raw.bookmarks !== undefined) {
    const bookmarks = collect(raw.bookmarks, parseBookmark);
    if (bookmarks) out.bookmarks = bookmarks;
    else console.warn("topology.view.json: bookmarks is not an array, dropping");
  }
  if (raw.lastSelectionIds !== undefined) {
    if (isStrArr(raw.lastSelectionIds)) out.lastSelectionIds = raw.lastSelectionIds;
    else console.warn("topology.view.json: lastSelectionIds is not a string[], dropping");
  }
  return out;
}

export function serializeViewerState(s: ViewerState): string {
  return JSON.stringify(s, null, 2) + "\n";
}
