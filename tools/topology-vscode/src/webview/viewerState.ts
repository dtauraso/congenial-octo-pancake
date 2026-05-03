// Viewer state — sidecar to topology.json. None of these fields belong in the
// spec; topogen ignores them entirely. See drag-to-author-plan.md §"Spec vs
// viewer state" for the policy.

export type Camera = { x: number; y: number; w: number; h: number };

export type SavedView = {
  name: string;
  viewport: { x: number; y: number; w: number; h: number };
  nodeIds: string[];
};

export type Fold = {
  id: string;
  label: string;
  memberIds: string[];
  position: [number, number];
  collapsed: boolean;
};

export type Bookmark = { name: string; t: number };

export type ViewerState = {
  camera?: Camera;
  views?: SavedView[];
  folds?: Fold[];
  bookmarks?: Bookmark[];
  lastSelectionIds?: string[];
};

export const DEFAULT_VIEWER_STATE: ViewerState = {};

export function parseViewerState(text: string | undefined): ViewerState {
  if (!text) return { ...DEFAULT_VIEWER_STATE };
  try {
    const v = JSON.parse(text);
    return v && typeof v === "object" ? (v as ViewerState) : { ...DEFAULT_VIEWER_STATE };
  } catch {
    return { ...DEFAULT_VIEWER_STATE };
  }
}

export function serializeViewerState(s: ViewerState): string {
  return JSON.stringify(s, null, 2) + "\n";
}
