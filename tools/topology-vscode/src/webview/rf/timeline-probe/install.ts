// Module-load side effect: install window globals (__timelineReport,
// __timelineDump, __timelineMarker), subscribe to runner events, and
// start the heartbeat dump.

import { vscode } from "../../save";
import {
  getSimTime,
  getWorld,
  isPlaying,
  subscribe,
  subscribeState,
} from "../../../sim/runner";
import { noteMarker } from "./notes";
import {
  HEARTBEAT_MS,
  clearRing,
  isDirty,
  markClean,
  probeEnabled,
  push,
  snapshot,
} from "./ring-buffer";

if (typeof window !== "undefined") {
  if (!window.__timelineLog) window.__timelineLog = [];
  if (window.__timelineProbe === undefined) window.__timelineProbe = true;

  window.__timelineReport = (opts) => {
    const snap = snapshot();
    if (opts?.clear !== false) clearRing();
    return snap;
  };

  window.__timelineDump = () => {
    const snap = snapshot();
    if (snap.length === 0) return 0;
    markClean();
    vscode.postMessage({
      type: "timeline-dump",
      json: JSON.stringify({ ts: Date.now(), entries: snap }, null, 0),
    });
    return snap.length;
  };

  window.__timelineMarker = noteMarker;

  setInterval(() => {
    if (!isDirty()) return;
    window.__timelineDump?.();
  }, HEARTBEAT_MS);

  subscribe((ev) => {
    if (!probeEnabled()) return;
    if (ev.type === "fire") {
      push({
        wallTs: Date.now(),
        simTime: getSimTime(),
        simTick: ev.tick,
        kind: "fire",
        nodeId: ev.nodeId,
        inputPort: ev.inputPort,
        inputValue: ev.inputValue as number | string,
      });
    } else {
      push({
        wallTs: Date.now(),
        simTime: getSimTime(),
        simTick: ev.tick,
        kind: "emit",
        edgeId: ev.edgeId,
        fromNodeId: ev.fromNodeId,
        toNodeId: ev.toNodeId,
        value: ev.value as number | string,
      });
    }
  });

  let prevPlaying = isPlaying();
  subscribeState(() => {
    const playing = isPlaying();
    if (playing === prevPlaying) return;
    prevPlaying = playing;
    const w = getWorld();
    push({
      wallTs: Date.now(),
      simTime: getSimTime(),
      simTick: w ? w.tick : -1,
      kind: playing ? "play" : "pause",
    });
  });
}
