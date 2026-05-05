import { vscode } from "../../save";

// Visual invariant probe. On by default so drift is always being
// measured. Each pulse measures rendered label center against the
// dot center and logs if offset deviates from the configured value.
// Disable at runtime with `window.__pulseProbe = false` or
// `localStorage.setItem("pulseProbe","0")`.
export type ProbeLogEntry = {
  ts: number;
  edgeId: string;
  drift: number;
  tangentSlip: number;
  measuredOffset: number;
  expectedOffset: number;
  angleDeg: number;
  arcFrac: number;
};
declare global {
  interface Window {
    __pulseProbe?: boolean;
    __pulseProbeLog?: ProbeLogEntry[];
    __pulseProbeReport?: (opts?: { clear?: boolean }) => ProbeLogEntry[];
    __pulseProbeDump?: () => number;
  }
}

// Install probe globals eagerly at module load so external callers see
// __pulseProbeDump / __pulseProbeReport even before the first pulse fires.
if (typeof window !== "undefined") {
  if (!window.__pulseProbeLog) window.__pulseProbeLog = [];
  window.__pulseProbeReport = (opts) => {
    const log = window.__pulseProbeLog ?? [];
    const snapshot = log.slice();
    if (opts?.clear !== false) window.__pulseProbeLog = [];
    return snapshot;
  };
  // Posts the current log to the extension host, which writes it to
  // <workspaceRoot>/.probe/pulse-last.json. Always clears the in-memory
  // log after dumping — the file is the durable record.
  window.__pulseProbeDump = () => {
    const log = window.__pulseProbeLog ?? [];
    const snapshot = log.slice();
    window.__pulseProbeLog = [];
    vscode.postMessage({
      type: "pulse-probe-dump",
      json: JSON.stringify({ ts: Date.now(), entries: snapshot }, null, 2),
    });
    return snapshot.length;
  };
}

export function probeLog(): ProbeLogEntry[] {
  if (typeof window === "undefined") return [];
  return window.__pulseProbeLog ?? [];
}

// Auto-dump after a quiet period whenever new entries arrive.
const PROBE_DUMP_DEBOUNCE_MS = 500;
let probeDumpTimer: ReturnType<typeof setTimeout> | null = null;
export function scheduleProbeDump(): void {
  if (typeof window === "undefined") return;
  if (probeDumpTimer !== null) clearTimeout(probeDumpTimer);
  probeDumpTimer = setTimeout(() => {
    probeDumpTimer = null;
    window.__pulseProbeDump?.();
  }, PROBE_DUMP_DEBOUNCE_MS);
}

// Heartbeat: every PROBE_HEARTBEAT_MS, dump the log if any pulse
// rendered since the last dump. Guarantees a refreshed file on disk
// for external readers — clean runs (no drift entries) still produce
// a file with `entries: []`, the positive "things look fine" signal.
const PROBE_HEARTBEAT_MS = 5000;
let probePulsedSinceDump = false;
export function noteProbePulse(): void {
  probePulsedSinceDump = true;
}
if (typeof window !== "undefined") {
  setInterval(() => {
    if (!probePulsedSinceDump) return;
    probePulsedSinceDump = false;
    window.__pulseProbeDump?.();
  }, PROBE_HEARTBEAT_MS);
}

export const PULSE_PROBE_DRIFT_PX = 0.01;
export const PULSE_PROBE_TANGENT_PX = 0.01;
export function pulseProbeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (window.__pulseProbe === false) return false;
  try {
    if (window.localStorage?.getItem("pulseProbe") === "0") return false;
  } catch { /* localStorage unavailable — fall through to default */ }
  return true;
}

export type ProbeWorst = {
  drift: number;
  tangentSlip: number;
  arcFrac: number;
  measuredOffset: number;
  measuredAngleDeg: number;
};
