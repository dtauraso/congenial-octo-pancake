// Saved-views panel. Freezes the current viewport + a member set of nodes as
// a named view; clicking the view name jumps back and dims everything outside
// the member set. Members come from current selection if non-empty, else
// nodes fully contained in the current viewport.

import { useState } from "react";
import { useReactFlow } from "reactflow";
import { NODE_TYPES } from "../../schema";
import { scheduleViewSave } from "../save";
import {
  getSpec,
  getViewerState,
  mutateViewer,
  setDimmed,
  setView,
  useViewerState,
} from "../state";
import type { SavedView } from "../viewerState";
import { boxToViewport, viewportToBox, type ViewBox } from "../rf/camera";

function paneSize(): { width: number; height: number } | null {
  const pane = document.querySelector<HTMLElement>(".react-flow");
  if (!pane) return null;
  const r = pane.getBoundingClientRect();
  return { width: r.width, height: r.height };
}

export function ViewsPanel() {
  const viewer = useViewerState();
  const rf = useReactFlow();
  const [namingMode, setNamingMode] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [activeName, setActiveName] = useState<string | undefined>(undefined);

  const views = viewer.views ?? [];

  const finishInput = (commit: boolean) => {
    const value = draftName.trim();
    setNamingMode(false);
    setDraftName("");
    if (commit && value) saveView(value);
  };

  const saveView = (name: string) => {
    const size = paneSize();
    if (!size) return;
    const vb: ViewBox = viewportToBox(rf.getViewport(), size.width, size.height);
    setView({ x: vb.x, y: vb.y, w: vb.w, h: vb.h });
    const sel = getViewerState().lastSelectionIds ?? [];
    const ids = sel.length > 0 ? [...sel] : nodesInBox(vb);
    const next: SavedView = {
      name,
      viewport: { x: vb.x, y: vb.y, w: vb.w, h: vb.h },
      nodeIds: ids,
    };
    mutateViewer((s) => {
      const list = s.views ?? [];
      const idx = list.findIndex((v) => v.name === name);
      if (idx >= 0) list[idx] = next;
      else list.push(next);
      s.views = list;
    });
    scheduleViewSave();
  };

  const deleteView = (name: string) => {
    mutateViewer((s) => {
      s.views = (s.views ?? []).filter((v) => v.name !== name);
    });
    if (activeName === name) {
      setActiveName(undefined);
      setDimmed(null);
    }
    scheduleViewSave();
  };

  const applySavedView = (v: SavedView) => {
    if (v.viewport) {
      const size = paneSize();
      if (size) {
        const vp = boxToViewport(v.viewport, size.width, size.height);
        rf.setViewport(vp);
      }
      setView({ x: v.viewport.x, y: v.viewport.y, w: v.viewport.w, h: v.viewport.h });
      scheduleViewSave();
    }
    setActiveName(v.name);
    setDimmed(new Set(v.nodeIds));
  };

  const clearActive = () => {
    setActiveName(undefined);
    setDimmed(null);
  };

  return (
    <div className="views-panel" data-undo-scope="viewer">
      <div className="views-header">views</div>
      {namingMode ? (
        <input
          autoFocus
          className="views-name-input"
          type="text"
          placeholder="view name…"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") finishInput(true);
            else if (e.key === "Escape") finishInput(false);
          }}
          onBlur={() => finishInput(true)}
        />
      ) : (
        <button
          type="button"
          className="views-save"
          title="Save the current viewport as a named view"
          onClick={() => { setDraftName(""); setNamingMode(true); }}
        >
          + save current
        </button>
      )}
      <div className="views-list">
        {views.length === 0 ? (
          <div className="views-empty">no saved views</div>
        ) : (
          views.map((v) => (
            <div
              key={v.name}
              className={"views-row" + (v.name === activeName ? " active" : "")}
            >
              <button
                type="button"
                className="views-name"
                title={`${v.nodeIds.length} node${v.nodeIds.length === 1 ? "" : "s"} — click again to clear`}
                onClick={() => (v.name === activeName ? clearActive() : applySavedView(v))}
              >
                {v.name}
              </button>
              <button
                type="button"
                className="views-del"
                title="delete view"
                onClick={() => deleteView(v.name)}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function nodesInBox(v: ViewBox): string[] {
  // Fully-contained membership only — partial overlap would dim nothing
  // whenever the user has the full graph in view.
  const x0 = v.x;
  const y0 = v.y;
  const x1 = v.x + v.w;
  const y1 = v.y + v.h;
  return getSpec().nodes
    .filter((n) => {
      const def = NODE_TYPES[n.type] ?? NODE_TYPES.Generic;
      return n.x >= x0 && n.y >= y0 && n.x + def.width <= x1 && n.y + def.height <= y1;
    })
    .map((n) => n.id);
}
