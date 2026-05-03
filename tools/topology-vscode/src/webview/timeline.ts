// Bottom control strip: play/pause + step + speed slider + tick/cycle
// readout + bookmark list. Bookmarks are resumption coordinates
// {name, startNodeId, cycle} (Phase 5.5 Chunk D); clicking one calls
// runner.jumpTo(cycle, startNodeId) which fast-forwards the simulator
// via deterministic F1 replay and leaves it paused.

import {
  getTickMs,
  getWorld,
  isPlaying,
  jumpTo,
  pause,
  play,
  setTickMs,
  stepOnce,
  subscribeState,
} from "../sim/runner";
import { scheduleViewSave } from "./save";
import { viewerState } from "./state";
import type { Bookmark } from "./viewerState";

let panel: HTMLDivElement;
let playBtn: HTMLButtonElement;
let stepBtn: HTMLButtonElement;
let speed: HTMLInputElement;
let label: HTMLSpanElement;
let bookmarksEl: HTMLDivElement;
let addBtn: HTMLButtonElement;
let nameInput: HTMLInputElement;

export function initTimelinePanel() {
  panel = document.createElement("div");
  panel.className = "timeline-panel";

  playBtn = document.createElement("button");
  playBtn.className = "timeline-play";
  playBtn.addEventListener("click", () => {
    if (isPlaying()) pause();
    else play();
  });

  stepBtn = document.createElement("button");
  stepBtn.className = "timeline-step";
  stepBtn.textContent = "⏭";
  stepBtn.title = "step one event";
  stepBtn.addEventListener("click", () => {
    pause();
    stepOnce();
  });

  speed = document.createElement("input");
  speed.type = "range";
  speed.className = "timeline-speed";
  speed.min = "60";
  speed.max = "1500";
  speed.step = "20";
  speed.value = String(getTickMs());
  speed.title = "tick interval (ms)";
  speed.addEventListener("input", () => setTickMs(Number(speed.value)));

  label = document.createElement("span");
  label.className = "timeline-time";

  addBtn = document.createElement("button");
  addBtn.className = "timeline-add";
  addBtn.textContent = "+ bookmark";
  addBtn.title = "save current cycle as a bookmark on the focused node";

  nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "bookmark name…";
  nameInput.className = "timeline-name-input";
  nameInput.style.display = "none";

  addBtn.addEventListener("click", () => {
    const w = getWorld();
    if (!w) return;
    pause();
    addBtn.style.display = "none";
    nameInput.style.display = "";
    nameInput.value = "";
    nameInput.focus();
  });
  const finishInput = (commit: boolean) => {
    const name = nameInput.value.trim();
    nameInput.style.display = "none";
    addBtn.style.display = "";
    if (commit && name) {
      const w = getWorld();
      if (!w) return;
      // The "focused" node for the bookmark is whatever the user has
      // selected — the closest analogue to "where they were looking
      // when they marked this moment." Falls back to the most recently
      // fired node from history if nothing is selected.
      const sel = (viewerState.lastSelectionIds ?? [])[0];
      const lastFired = w.history.length > 0
        ? w.history[w.history.length - 1].nodeId
        : "";
      const startNodeId = sel ?? lastFired;
      if (!startNodeId) return;
      addBookmark(name, startNodeId, w.cycle);
    }
  };
  nameInput.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") finishInput(true);
    else if (ev.key === "Escape") finishInput(false);
  });
  nameInput.addEventListener("blur", () => finishInput(true));

  bookmarksEl = document.createElement("div");
  bookmarksEl.className = "timeline-markers";

  panel.appendChild(playBtn);
  panel.appendChild(stepBtn);
  panel.appendChild(speed);
  panel.appendChild(label);
  panel.appendChild(bookmarksEl);
  panel.appendChild(addBtn);
  panel.appendChild(nameInput);
  document.body.appendChild(panel);

  subscribeState(updateUI);
  renderBookmarks();
  updateUI();
}

export function refreshTimelinePanel() {
  if (!panel) return;
  renderBookmarks();
  updateUI();
}

function updateUI() {
  if (!panel) return;
  const w = getWorld();
  playBtn.textContent = isPlaying() ? "⏸" : "▶";
  playBtn.title = isPlaying() ? "pause" : "play";
  if (w) {
    label.textContent = `tick ${w.tick} · cycle ${w.cycle} · queued ${w.queue.length}`;
  } else {
    label.textContent = "—";
  }
}

function renderBookmarks() {
  bookmarksEl.replaceChildren();
  for (const b of viewerState.bookmarks ?? []) {
    const m = document.createElement("button");
    m.className = "timeline-marker";
    m.title = `${b.name} → cycle ${b.cycle} on ${b.startNodeId} (Delete to remove)`;
    m.textContent = `${b.name} ⤴`;
    m.addEventListener("click", (ev) => {
      ev.stopPropagation();
      jumpTo(b.cycle, b.startNodeId);
      m.focus();
    });
    m.addEventListener("keydown", (ev) => {
      if (ev.key === "Delete" || ev.key === "Backspace") {
        ev.preventDefault();
        deleteBookmark(b.name);
      }
    });
    bookmarksEl.appendChild(m);
  }
}

function addBookmark(name: string, startNodeId: string, cycle: number) {
  const list = viewerState.bookmarks ?? [];
  const idx = list.findIndex((b) => b.name === name);
  const next: Bookmark = { name, startNodeId, cycle };
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  list.sort((a, b) => a.cycle - b.cycle);
  viewerState.bookmarks = list;
  scheduleViewSave();
  renderBookmarks();
}

function deleteBookmark(name: string) {
  const list = viewerState.bookmarks ?? [];
  viewerState.bookmarks = list.filter((b) => b.name !== name);
  scheduleViewSave();
  renderBookmarks();
}
