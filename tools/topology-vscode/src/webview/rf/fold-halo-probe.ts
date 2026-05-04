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
  // "mount" = hook just initialized; carries initial buffered-union state
  // so the log always shows the starting condition even when transitions
  // happened before the probe was attached.
  // "fire" = a member fired but the fold's buffered-union didn't change.
  // "start"/"end" = the union flipped, so the visible halo turned on/off.
  kind: "mount" | "fire" | "start" | "end";
  // initialBuffered is set on "mount" entries: true means the halo was
  // already on at attach time (and therefore "start" won't be logged for
  // that initial activation — read this entry as the implicit start).
  initialBuffered?: boolean;
  triggerNodeId: string;
  // bufferedAfter: which members hold a buffered input port AFTER this
  // event's handler ran. A halo "start" needs at least one entry here on
  // the on-edge, "end" needs zero. If "fire" entries never appear despite
  // member activity, the runner subscription isn't reaching the hook.
  bufferedAfter: Array<{ id: string; ports: string[] }>;
  // worldStateKeys: top-level keys present in the trigger member's state
  // object. If __has_<port> never appears here while the member's port
  // halo IS visible when expanded, something is filtering / mutating
  // state between the runner and the probe.
  triggerStateKeys: string[];
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

export function recordFoldHaloEvent(
  foldId: string,
  kind: "mount" | "fire" | "start" | "end",
  triggerNodeId: string,
  memberIds: string[],
  initialBuffered?: boolean,
): void {
  if (!probeEnabled()) return;
  const world = getWorld();
  const bufferedAfter: FoldHaloEntry["bufferedAfter"] = [];
  for (const id of memberIds) {
    const ports = bufferedPorts(world?.state?.[id]);
    if (ports.length > 0) bufferedAfter.push({ id, ports });
  }
  const triggerState = world?.state?.[triggerNodeId];
  const triggerStateKeys = triggerState ? Object.keys(triggerState) : [];
  const entry: FoldHaloEntry = {
    ts: Date.now(),
    foldId,
    kind,
    triggerNodeId,
    bufferedAfter,
    triggerStateKeys,
    ...(initialBuffered !== undefined ? { initialBuffered } : {}),
  };
  if (typeof window !== "undefined") {
    (window.__foldHaloLog ??= []).push(entry);
    transitionsSinceDump = true;
    scheduleDump();
  }
}
