// Unified timeline probe. Captures every emit, fire, animation
// start/end, and play-state change with sim+wall timestamps so AI
// agents and CLI readers can reconstruct exactly what was happening
// at any moment without devtools access. Closes the asymmetry between
// what the user sees on-screen (animations) and what shows up in the
// disk probes.
//
// Performance budget: O(1) per event. Hot path is a single object
// allocation + ring-buffer slot write. JSON.stringify only happens at
// dump time (debounced). Disabled-fast-path returns immediately if the
// probe is off, so it costs nothing in production runs.

import { vscode } from "../save";
import { subscribe, subscribeState, isPlaying, getSimTime, getWorld } from "../../sim/runner";

export type TimelineEntry = {
  // Wall-clock ms (Date.now). Useful for cross-correlating with other
  // probes that timestamp in wall ms.
  wallTs: number;
  // Sim time in ms — frozen on pause. Identical units as wallTs but
  // pause-aware. The unified-clock work made this consistent across
  // animations and probe entries.
  simTime: number;
  // Sim tick at the moment of the event, when known (-1 if no world).
  simTick: number;
  kind:
    | "emit"
    | "fire"
    | "anim-start"
    | "anim-end"
    | "play"
    | "pause"
    | "marker";
  // Free-form payload, minimal allocations: store only string/number
  // primitives so JSON.stringify at dump time is cheap and the entries
  // are small.
  edgeId?: string;
  fromNodeId?: string;
  toNodeId?: string;
  nodeId?: string;
  inputPort?: string;
  inputValue?: number | string;
  value?: number | string;
  // anim-end fields
  completed?: boolean;
  arcTraveled?: number;
  // free-form note for marker entries (used by tests / manual sessions)
  note?: string;
};

declare global {
  interface Window {
    __timelineProbe?: boolean;
    __timelineLog?: TimelineEntry[];
    __timelineReport?: (opts?: { clear?: boolean }) => TimelineEntry[];
    __timelineDump?: () => number;
    __timelineMarker?: (note: string) => void;
  }
}

const MAX_ENTRIES = 2000;
const DUMP_DEBOUNCE_MS = 500;
const HEARTBEAT_MS = 5000;

// Ring buffer: fixed-size array, pointer wraps. Push is one bounds-
// checked write — no array growth, no shift, no allocation beyond the
// entry object itself.
const ring: Array<TimelineEntry | null> = new Array(MAX_ENTRIES).fill(null);
let writeIdx = 0;
let entryCount = 0;
let dirtySinceDump = false;

function probeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (window.__timelineProbe === false) return false;
  return true;
}

function push(entry: TimelineEntry): void {
  if (!probeEnabled()) return;
  ring[writeIdx] = entry;
  writeIdx = (writeIdx + 1) % MAX_ENTRIES;
  if (entryCount < MAX_ENTRIES) entryCount++;
  dirtySinceDump = true;
  scheduleDump();
}

function snapshot(): TimelineEntry[] {
  if (entryCount < MAX_ENTRIES) {
    return ring.slice(0, entryCount).filter((e): e is TimelineEntry => e !== null);
  }
  // Wrapped — read from writeIdx forward, then 0..writeIdx.
  const out: TimelineEntry[] = [];
  for (let i = 0; i < MAX_ENTRIES; i++) {
    const e = ring[(writeIdx + i) % MAX_ENTRIES];
    if (e) out.push(e);
  }
  return out;
}

let dumpTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleDump(): void {
  if (typeof window === "undefined") return;
  if (dumpTimer !== null) clearTimeout(dumpTimer);
  dumpTimer = setTimeout(() => {
    dumpTimer = null;
    window.__timelineDump?.();
  }, DUMP_DEBOUNCE_MS);
}

function currentSimTick(): number {
  const w = getWorld();
  return w ? w.tick : -1;
}

// ---- public API: instrumentation hooks called from animation code ----

export function noteAnimStart(edgeId: string): void {
  if (!probeEnabled()) return;
  push({
    wallTs: Date.now(),
    simTime: getSimTime(),
    simTick: currentSimTick(),
    kind: "anim-start",
    edgeId,
  });
}

export function noteAnimEnd(edgeId: string, completed: boolean, arcTraveled: number): void {
  if (!probeEnabled()) return;
  push({
    wallTs: Date.now(),
    simTime: getSimTime(),
    simTick: currentSimTick(),
    kind: "anim-end",
    edgeId,
    completed,
    arcTraveled,
  });
}

export function noteMarker(note: string): void {
  if (!probeEnabled()) return;
  push({
    wallTs: Date.now(),
    simTime: getSimTime(),
    simTick: currentSimTick(),
    kind: "marker",
    note,
  });
}

// ---- module-load side effect: subscribe to runner events globally ----
// One subscription for the whole app — avoids N copies if multiple
// components subscribed independently. The listener is hot-path: keep
// it allocation-light. We do exactly one object allocation per event.

if (typeof window !== "undefined") {
  if (!window.__timelineLog) window.__timelineLog = [];
  if (window.__timelineProbe === undefined) window.__timelineProbe = true;

  window.__timelineReport = (opts) => {
    const snap = snapshot();
    if (opts?.clear !== false) {
      ring.fill(null);
      writeIdx = 0;
      entryCount = 0;
    }
    return snap;
  };

  window.__timelineDump = () => {
    const snap = snapshot();
    if (snap.length === 0) return 0;
    dirtySinceDump = false;
    vscode.postMessage({
      type: "timeline-dump",
      json: JSON.stringify({ ts: Date.now(), entries: snap }, null, 0),
    });
    return snap.length;
  };

  window.__timelineMarker = noteMarker;

  setInterval(() => {
    if (!dirtySinceDump) return;
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
    if (playing !== prevPlaying) {
      prevPlaying = playing;
      push({
        wallTs: Date.now(),
        simTime: getSimTime(),
        simTick: currentSimTick(),
        kind: playing ? "play" : "pause",
      });
    }
  });
}
