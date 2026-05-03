// Saved-views panel. Lets the user freeze the current viewport + a member set
// of nodes as a named view, then jump back to it later. Members are computed
// from current viewport (selection model lands in Phase 3).

import { NODE_TYPES } from "../schema";
import { applyDim as applyDimRf, onPanStart, selectedNodeIds } from "./rf/bridge";
import { scheduleViewSave } from "./save";
import { spec, view, viewerState } from "./state";
import { applyView, syncViewFromRenderer } from "./view";
import type { SavedView } from "./viewerState";

let panel: HTMLDivElement;
let listEl: HTMLDivElement;
let activeViewName: string | undefined;

export function initViewsPanel() {
  panel = document.createElement("div");
  panel.className = "views-panel";

  const header = document.createElement("div");
  header.className = "views-header";
  header.textContent = "views";

  const saveBtn = document.createElement("button");
  saveBtn.className = "views-save";
  saveBtn.textContent = "+ save current";
  saveBtn.title = "Save the current viewport as a named view";

  const nameInput = document.createElement("input");
  nameInput.className = "views-name-input";
  nameInput.type = "text";
  nameInput.placeholder = "view name…";
  nameInput.style.display = "none";

  saveBtn.addEventListener("click", () => {
    saveBtn.style.display = "none";
    nameInput.style.display = "";
    nameInput.value = "";
    nameInput.focus();
  });
  const finishInput = (commit: boolean) => {
    const value = nameInput.value.trim();
    nameInput.style.display = "none";
    saveBtn.style.display = "";
    if (commit && value) saveView(value);
  };
  nameInput.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") finishInput(true);
    else if (ev.key === "Escape") finishInput(false);
  });
  nameInput.addEventListener("blur", () => finishInput(true));

  listEl = document.createElement("div");
  listEl.className = "views-list";

  panel.appendChild(header);
  panel.appendChild(saveBtn);
  panel.appendChild(nameInput);
  panel.appendChild(listEl);
  document.body.appendChild(panel);

  renderList();
}

export function refreshViewsPanel() {
  if (!panel) return;
  renderList();
}

function renderList() {
  listEl.replaceChildren();
  const views = viewerState.views ?? [];
  if (views.length === 0) {
    const empty = document.createElement("div");
    empty.className = "views-empty";
    empty.textContent = "no saved views";
    listEl.appendChild(empty);
    return;
  }
  for (const v of views) {
    const row = document.createElement("div");
    row.className = "views-row" + (v.name === activeViewName ? " active" : "");

    const name = document.createElement("button");
    name.className = "views-name";
    name.textContent = v.name;
    name.title = `${v.nodeIds.length} node${v.nodeIds.length === 1 ? "" : "s"} — click again to clear`;
    name.addEventListener("click", () => {
      if (v.name === activeViewName) clearActiveView();
      else applySavedView(v);
    });

    const del = document.createElement("button");
    del.className = "views-del";
    del.textContent = "×";
    del.title = "delete view";
    del.addEventListener("click", () => deleteView(v.name));

    row.appendChild(name);
    row.appendChild(del);
    listEl.appendChild(row);
  }
}

function saveView(name: string) {
  syncViewFromRenderer();
  // Prefer the user's current selection. If nothing is selected, fall back
  // to nodes fully contained in the current viewport.
  const sel = selectedNodeIds();
  const ids = sel.length > 0 ? sel : nodesInViewport();
  const next: SavedView = {
    name,
    viewport: { x: view.x, y: view.y, w: view.w, h: view.h },
    nodeIds: ids,
  };
  const views = viewerState.views ?? [];
  const existingIdx = views.findIndex((v) => v.name === name);
  if (existingIdx >= 0) views[existingIdx] = next;
  else views.push(next);
  viewerState.views = views;
  scheduleViewSave();
  renderList();
}

function deleteView(name: string) {
  const views = viewerState.views ?? [];
  viewerState.views = views.filter((v) => v.name !== name);
  if (activeViewName === name) clearActiveView();
  scheduleViewSave();
  renderList();
}

function applySavedView(v: SavedView) {
  view.x = v.viewport.x;
  view.y = v.viewport.y;
  view.w = v.viewport.w;
  view.h = v.viewport.h;
  applyView();
  scheduleViewSave();
  setActiveView(v.name, new Set(v.nodeIds));
}

function setActiveView(name: string, members: Set<string>) {
  activeViewName = name;
  applyDim(members);
  renderList();
}

export function clearActiveView() {
  activeViewName = undefined;
  applyDim(undefined);
  if (panel) renderList();
}

function applyDim(members: Set<string> | undefined) {
  applyDimRf(members);
}

function nodesInViewport(): string[] {
  // Fully-contained membership (not just intersection): a node counts only if
  // its whole bbox sits inside the viewport. Otherwise the dim contrast
  // disappears whenever the user has the full graph in view.
  const x0 = view.x;
  const y0 = view.y;
  const x1 = view.x + view.w;
  const y1 = view.y + view.h;
  return spec.nodes
    .filter((n) => {
      const def = NODE_TYPES[n.type] ?? NODE_TYPES.Generic;
      return n.x >= x0 && n.y >= y0 && n.x + def.width <= x1 && n.y + def.height <= y1;
    })
    .map((n) => n.id);
}

// Previously dimmed-on-pan; now panning is free while a view is active so the
// user can navigate inside the isolated subset. Clear by clicking the active
// view name again.
export function attachClearOnPan() { /* no-op */ }
