// Saved-views panel. Lets the user freeze the current viewport + a member set
// of nodes as a named view, then jump back to it later. Members are computed
// from current viewport (selection model lands in Phase 3).

import { NODE_TYPES } from "../schema";
import { scheduleViewSave } from "./save";
import { spec, svg, view, viewerState } from "./state";
import { applyView } from "./view";
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
    name.title = `${v.nodeIds.length} node${v.nodeIds.length === 1 ? "" : "s"}`;
    name.addEventListener("click", () => applySavedView(v));

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
  const next: SavedView = {
    name,
    viewport: { x: view.x, y: view.y, w: view.w, h: view.h },
    nodeIds: nodesInViewport(),
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
  const nodes = svg.querySelectorAll<SVGGElement>(".node");
  const edges = svg.querySelectorAll<SVGGElement>("g[data-edge-id]");
  if (!members) {
    nodes.forEach((n) => n.classList.remove("dim"));
    edges.forEach((e) => e.classList.remove("dim"));
    return;
  }
  nodes.forEach((n) => {
    const id = n.dataset.id ?? "";
    n.classList.toggle("dim", !members.has(id));
  });
  for (const e of spec.edges) {
    const el = svg.querySelector<SVGGElement>(`g[data-edge-id="${cssEscape(e.id)}"]`);
    if (!el) continue;
    const inView = members.has(e.source) && members.has(e.target);
    el.classList.toggle("dim", !inView);
  }
}

function nodesInViewport(): string[] {
  const x0 = view.x;
  const y0 = view.y;
  const x1 = view.x + view.w;
  const y1 = view.y + view.h;
  return spec.nodes
    .filter((n) => {
      const def = NODE_TYPES[n.type] ?? NODE_TYPES.Generic;
      const nx0 = n.x;
      const ny0 = n.y;
      const nx1 = n.x + def.width;
      const ny1 = n.y + def.height;
      return nx1 >= x0 && nx0 <= x1 && ny1 >= y0 && ny0 <= y1;
    })
    .map((n) => n.id);
}

function cssEscape(s: string): string {
  return s.replace(/["\\]/g, "\\$&");
}

// Pan/zoom should drop the dimming — once you move, the framing no longer holds.
export function attachClearOnPan() {
  svg.addEventListener("pointerdown", (ev) => {
    if (ev.target === svg && activeViewName) clearActiveView();
  });
  svg.addEventListener("wheel", () => {
    if (activeViewName) clearActiveView();
  }, { passive: true });
}
