// Fold halo state-transition probe. Mirrors the pulse-probe pattern in
// AnimatedEdge.tsx so AI agents and CLI readers can tail
// `.probe/fold-halo-last.json` to track when each fold's halo turned on
// and off without opening webview devtools.
//
// Entries are pushed by `useFoldHaloState` on every off→on or on→off
// transition. Each entry captures the fold id, the transition direction,
// the trigger node id, and a snapshot of which members were buffered at
// the moment of the transition (so you can see why the union flipped).

import { vscode } from "../save";
import { bufferedPorts } from "../../sim/handlers";
import { getWorld } from "../../sim/runner";

export type FoldHaloEntry = {
  ts: number;
  foldId: string;
  transition: "start" | "end";
  triggerNodeId: string;
  bufferedMembers: Array<{ id: string; ports: string[] }>;
};

declare global {
  interface Window {
    __foldHaloProbe?: boolean;
    __foldHaloLog?: FoldHaloEntry[];
    __foldHaloReport?: (opts?: { clear?: boolean }) => FoldHaloEntry[];
    __foldHaloDump?: () => number;
  }
}

if (typeof window !== "undefined") {
  if (!window.__foldHaloLog) window.__foldHaloLog = [];
  window.__foldHaloReport = (opts) => {
    const log = window.__foldHaloLog ?? [];
    const snapshot = log.slice();
    if (opts?.clear !== false) window.__foldHaloLog = [];
    return snapshot;
  };
  window.__foldHaloDump = () => {
    const log = window.__foldHaloLog ?? [];
    const snapshot = log.slice();
    window.__foldHaloLog = [];
    vscode.postMessage({
      type: "fold-halo-dump",
      json: JSON.stringify({ ts: Date.now(), entries: snapshot }, null, 2),
    });
    return snapshot.length;
  };
}

const DUMP_DEBOUNCE_MS = 500;
let dumpTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleDump(): void {
  if (typeof window === "undefined") return;
  if (dumpTimer !== null) clearTimeout(dumpTimer);
  dumpTimer = setTimeout(() => {
    dumpTimer = null;
    window.__foldHaloDump?.();
  }, DUMP_DEBOUNCE_MS);
}

const HEARTBEAT_MS = 5000;
let transitionsSinceDump = false;
if (typeof window !== "undefined") {
  setInterval(() => {
    if (!transitionsSinceDump) return;
    transitionsSinceDump = false;
    window.__foldHaloDump?.();
  }, HEARTBEAT_MS);
}

function probeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (window.__foldHaloProbe === false) return false;
  try {
    if (window.localStorage?.getItem("foldHaloProbe") === "0") return false;
  } catch {
    // localStorage may throw in restricted contexts
  }
  return true;
}

export function recordFoldHaloTransition(
  foldId: string,
  transition: "start" | "end",
  triggerNodeId: string,
  memberIds: string[],
): void {
  if (!probeEnabled()) return;
  const world = getWorld();
  const bufferedMembers: FoldHaloEntry[]["bufferedMembers"] = [];
  for (const id of memberIds) {
    const ports = bufferedPorts(world?.state?.[id]);
    if (ports.length > 0) bufferedMembers.push({ id, ports });
  }
  const entry: FoldHaloEntry = {
    ts: Date.now(),
    foldId,
    transition,
    triggerNodeId,
    bufferedMembers,
  };
  if (typeof window !== "undefined") {
    (window.__foldHaloLog ??= []).push(entry);
    transitionsSinceDump = true;
    scheduleDump();
  }
}
