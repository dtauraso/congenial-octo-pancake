// Bottom control strip: play/pause + step + speed slider + tick/cycle
// readout + bookmark list. Bookmarks are resumption coordinates
// {name, startNodeId, cycle} (Phase 5.5 Chunk D); clicking one calls
// runner.jumpTo(cycle, startNodeId) which fast-forwards the simulator
// via deterministic F1 replay and leaves it paused.

import {
  getTickMs,
  getWorld,
  isPlaying,
  isReplaying,
  jumpTo,
  load as loadRunner,
  loadTrace,
  pause,
  play,
  setTickMs,
  stepOnce,
  subscribeState,
} from "../sim/runner";
import { scheduleViewSave, vscode } from "./save";
import { getSpec, viewerState } from "./state";
import { parseTrace, type TraceEvent } from "../sim/trace";
import { historyToTrace } from "../sim/trace";
import { detectDrift, summarizeDrift } from "../sim/drift";
import { initWorld, runUntil } from "../sim/simulator";
import type { Bookmark } from "./viewerState";

let panel: HTMLDivElement;
let playBtn: HTMLButtonElement;
let stepBtn: HTMLButtonElement;
let speed: HTMLInputElement;
let label: HTMLSpanElement;
let bookmarksEl: HTMLDivElement;
let addBtn: HTMLButtonElement;
let nameInput: HTMLInputElement;
let traceBtn: HTMLButtonElement;
let traceLabel: HTMLSpanElement;
let driftLabel: HTMLSpanElement;

// Loaded trace + label, and the simulator's projected events for the
// same spec. Held in module scope so the UI can re-render drift status
// on subscribeState ticks without recomputing.
let loadedTrace: TraceEvent[] | null = null;
let loadedTraceName = "";
let driftSummary = "";

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

  traceBtn = document.createElement("button");
  traceBtn.className = "timeline-trace";
  traceBtn.textContent = "load trace";
  traceBtn.title = "load a *.trace.jsonl and replay it on this spec";
  traceBtn.addEventListener("click", () => {
    if (loadedTrace) clearTrace();
    else vscode.postMessage({ type: "trace-load" });
  });

  traceLabel = document.createElement("span");
  traceLabel.className = "timeline-trace-label";

  driftLabel = document.createElement("span");
  driftLabel.className = "timeline-drift";

  panel.appendChild(playBtn);
  panel.appendChild(stepBtn);
  panel.appendChild(speed);
  panel.appendChild(label);
  panel.appendChild(traceBtn);
  panel.appendChild(traceLabel);
  panel.appendChild(driftLabel);
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
  if (isReplaying() && loadedTrace) {
    label.textContent = `replay · ${loadedTrace.length} events`;
  } else if (w) {
    label.textContent = `tick ${w.tick} · cycle ${w.cycle} · queued ${w.queue.length}`;
  } else {
    label.textContent = "—";
  }
  traceBtn.textContent = loadedTrace ? "exit replay" : "load trace";
  traceLabel.textContent = loadedTrace ? loadedTraceName : "";
  driftLabel.textContent = driftSummary;
  driftLabel.classList.toggle("ok", driftSummary.startsWith("no drift"));
  driftLabel.classList.toggle("err", driftSummary !== "" && !driftSummary.startsWith("no drift"));
}

// Host posted a trace file. Parse, switch the runner into replay mode,
// and compute drift against the simulator's projection of the same
// spec. The simulator runs silently to a step bound matching the
// trace length; if drift exists, the user sees the index in the
// status bar before pressing play.
export function onTraceLoaded(text: string, label: string) {
  let events: TraceEvent[];
  try {
    events = parseTrace(text);
  } catch (err) {
    onTraceError(err instanceof Error ? err.message : String(err));
    return;
  }
  loadedTrace = events;
  loadedTraceName = label;
  const spec = getSpec();
  loadTrace(spec, events);
  computeDrift();
  pause();
  updateUI();
}

export function onTraceError(message: string) {
  driftSummary = `trace error: ${message}`;
  updateUI();
}

function clearTrace() {
  loadedTrace = null;
  loadedTraceName = "";
  driftSummary = "";
  vscode.postMessage({ type: "trace-clear" });
  loadRunner(getSpec());
  updateUI();
}

function computeDrift() {
  if (!loadedTrace) {
    driftSummary = "";
    return;
  }
  // Project the simulator's history to the same wire format and
  // compare. Bound the simulator at one step beyond the trace length
  // so a length-mismatch (sim ran longer) is detectable rather than
  // silently truncated.
  const spec = getSpec();
  const recvCount = loadedTrace.filter((e) => e.kind === "recv").length;
  const cap = recvCount + 1;
  let i = 0;
  const w = runUntil(
    spec,
    initWorld(spec),
    () => ++i > cap,
    Math.max(cap * 8, 1000),
  );
  const simProjection = historyToTrace(w.history, spec);
  driftSummary = summarizeDrift(detectDrift(loadedTrace, simProjection));
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
