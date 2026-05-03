// Bottom control strip: play/pause + a live tick/cycle readout.
//
// Phase 5.5 stripped the global scrubber and the bookmarks-at-t markers
// — there is no master clock anymore, so `seek(t)` has no meaning. The
// bookmark UI returns in Chunk D as resumption coordinates
// {name, startNodeId, cycle} that fast-forward the simulator via
// replayTo. This module is intentionally minimal until then.

import {
  isPlaying,
  pause,
  play,
  subscribeState,
  getWorld,
} from "../sim/runner";

let panel: HTMLDivElement;
let playBtn: HTMLButtonElement;
let stepBtn: HTMLButtonElement;
let label: HTMLSpanElement;

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
  stepBtn.addEventListener("click", async () => {
    const { stepOnce } = await import("../sim/runner");
    pause();
    stepOnce();
  });

  label = document.createElement("span");
  label.className = "timeline-time";

  panel.appendChild(playBtn);
  panel.appendChild(stepBtn);
  panel.appendChild(label);
  document.body.appendChild(panel);

  subscribeState(updateUI);
  updateUI();
}

export function refreshTimelinePanel() {
  if (!panel) return;
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
