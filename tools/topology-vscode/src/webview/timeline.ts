// Bottom timeline strip: play/pause, scrubber, bookmark markers.
//
// Bookmarks live in viewerState.bookmarks (sidecar). Click a marker to seek
// to its t and pause; "+ bookmark" captures the current playhead.

import {
  getT01,
  isPlaying,
  pause,
  play,
  seek,
  subscribe,
} from "./playback";
import { scheduleViewSave } from "./save";
import { viewerState } from "./state";
import type { Bookmark } from "./viewerState";

let panel: HTMLDivElement;
let track: HTMLDivElement;
let playhead: HTMLDivElement;
let playBtn: HTMLButtonElement;
let timeLabel: HTMLSpanElement;
let markersEl: HTMLDivElement;
let addBtn: HTMLButtonElement;
let nameInput: HTMLInputElement;

export function initTimelinePanel() {
  panel = document.createElement("div");
  panel.className = "timeline-panel";

  playBtn = document.createElement("button");
  playBtn.className = "timeline-play";
  playBtn.addEventListener("click", () => {
    if (isPlaying()) pause(); else play();
  });

  track = document.createElement("div");
  track.className = "timeline-track";
  track.addEventListener("click", (ev) => {
    const rect = track.getBoundingClientRect();
    const t = (ev.clientX - rect.left) / rect.width;
    seek(t);
    pause();
  });

  markersEl = document.createElement("div");
  markersEl.className = "timeline-markers";
  track.appendChild(markersEl);

  playhead = document.createElement("div");
  playhead.className = "timeline-playhead";
  track.appendChild(playhead);

  timeLabel = document.createElement("span");
  timeLabel.className = "timeline-time";

  addBtn = document.createElement("button");
  addBtn.className = "timeline-add";
  addBtn.textContent = "+ bookmark";
  addBtn.title = "Add a bookmark at the current playhead";

  nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "bookmark name…";
  nameInput.className = "timeline-name-input";
  nameInput.style.display = "none";

  addBtn.addEventListener("click", () => {
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
    if (commit && name) addBookmark(name, getT01());
  };
  nameInput.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") finishInput(true);
    else if (ev.key === "Escape") finishInput(false);
  });
  nameInput.addEventListener("blur", () => finishInput(true));

  panel.appendChild(playBtn);
  panel.appendChild(track);
  panel.appendChild(timeLabel);
  panel.appendChild(addBtn);
  panel.appendChild(nameInput);
  document.body.appendChild(panel);

  subscribe(updateUI);
  renderMarkers();
  updateUI();
}

export function refreshTimelinePanel() {
  if (!panel) return;
  renderMarkers();
}

function updateUI() {
  if (!panel) return;
  const t = getT01();
  playhead.style.left = `${t * 100}%`;
  playBtn.textContent = isPlaying() ? "⏸" : "▶";
  playBtn.title = isPlaying() ? "pause" : "play";
  timeLabel.textContent = t.toFixed(3);
}

function renderMarkers() {
  markersEl.replaceChildren();
  const bookmarks = viewerState.bookmarks ?? [];
  for (const b of bookmarks) {
    const m = document.createElement("button");
    m.className = "timeline-marker";
    m.style.left = `${b.t * 100}%`;
    m.title = `${b.name} (t=${b.t.toFixed(3)}) — click to jump, Delete to remove`;
    m.textContent = b.name;
    m.addEventListener("click", (ev) => {
      ev.stopPropagation();
      seek(b.t);
      pause();
      m.focus();
    });
    m.addEventListener("keydown", (ev) => {
      if (ev.key === "Delete" || ev.key === "Backspace") {
        ev.preventDefault();
        deleteBookmark(b.name);
      }
    });
    markersEl.appendChild(m);
  }
}

function addBookmark(name: string, t: number) {
  const list = viewerState.bookmarks ?? [];
  const idx = list.findIndex((b) => b.name === name);
  const next: Bookmark = { name, t };
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  list.sort((a, b) => a.t - b.t);
  viewerState.bookmarks = list;
  scheduleViewSave();
  renderMarkers();
}

function deleteBookmark(name: string) {
  const list = viewerState.bookmarks ?? [];
  viewerState.bookmarks = list.filter((b) => b.name !== name);
  scheduleViewSave();
  renderMarkers();
}
