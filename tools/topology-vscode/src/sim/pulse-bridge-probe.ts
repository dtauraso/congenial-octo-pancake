// Per-edge pulse-mount/unmount counter. Catches view→sim bridge leaks
// where PulseInstance mounts (noteEdgePulseStarted) without a matching
// unmount (noteEdgePulseEnded). A leak holds the simulator's edge slot
// forever under deferSlotFreeToView and cascades to "stuck-pending"
// deadlocks. Mirrors error-probe lifecycle (eager init, debounced dump).

type BridgeEvent = {
  ts: number;
  kind: "start" | "end";
  edgeId: string;
};

declare global {
  interface Window {
    __pulseBridgeCounts?: Record<string, { started: number; ended: number }>;
    __pulseBridgeLog?: BridgeEvent[];
    __pulseBridgeDump?: () => number;
  }
}

const LOG_CAP = 500;
let dumpTimer: ReturnType<typeof setTimeout> | null = null;

function getVsCodeApi(): { postMessage(m: unknown): void } | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { __vscodeApi?: { postMessage(m: unknown): void } };
  return w.__vscodeApi ?? null;
}

function scheduleDump(): void {
  if (typeof window === "undefined") return;
  if (dumpTimer !== null) clearTimeout(dumpTimer);
  dumpTimer = setTimeout(() => {
    dumpTimer = null;
    window.__pulseBridgeDump?.();
  }, 250);
}

if (typeof window !== "undefined") {
  if (!window.__pulseBridgeCounts) window.__pulseBridgeCounts = {};
  if (!window.__pulseBridgeLog) window.__pulseBridgeLog = [];
  window.__pulseBridgeDump = () => {
    const counts = window.__pulseBridgeCounts ?? {};
    const log = window.__pulseBridgeLog ?? [];
    const leaks: Record<string, number> = {};
    for (const k of Object.keys(counts)) {
      const d = counts[k].started - counts[k].ended;
      if (d !== 0) leaks[k] = d;
    }
    const api = getVsCodeApi();
    if (api) {
      api.postMessage({
        type: "pulse-bridge-dump",
        json: JSON.stringify({ ts: Date.now(), leaks, counts, log: log.slice() }, null, 2),
      });
    }
    return Object.keys(leaks).length;
  };
}

function bump(edgeId: string, kind: "start" | "end"): void {
  if (typeof window === "undefined") return;
  const counts = (window.__pulseBridgeCounts ??= {});
  const c = (counts[edgeId] ??= { started: 0, ended: 0 });
  if (kind === "start") c.started++;
  else c.ended++;
  const log = (window.__pulseBridgeLog ??= []);
  log.push({ ts: Date.now(), kind, edgeId });
  if (log.length > LOG_CAP) log.splice(0, log.length - LOG_CAP);
  scheduleDump();
}

export function notePulseBridgeStart(edgeId: string): void { bump(edgeId, "start"); }
export function notePulseBridgeEnd(edgeId: string): void { bump(edgeId, "end"); }

export function getPulseBridgeLeaks(): Record<string, number> {
  if (typeof window === "undefined") return {};
  const counts = window.__pulseBridgeCounts ?? {};
  const leaks: Record<string, number> = {};
  for (const k of Object.keys(counts)) {
    const d = counts[k].started - counts[k].ended;
    if (d !== 0) leaks[k] = d;
  }
  return leaks;
}
