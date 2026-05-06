// Per-pulse instrumentation for the pulse-leak investigation
// (task/pulse-leak-investigation). When stuck-anim triggers in the
// RunnerProbe, dumpPulseProbe() prints the last-known frame state of
// every still-mounted pulse so we can see at what localT the leaked
// pulses froze and whether their swapStart is sane vs simNow.

type Entry = {
  id: number;
  edgeId: string;
  mountWall: number;
  firstFrameWall: number | null;
  lastFrameWall: number | null;
  frameCount: number;
  lastLocalT: number;
  lastElapsed: number;
  lastSwapStart: number;
  lastSimNow: number;
  remainingMs: number;
  rerunCount: number;
  completed: boolean;
};

const live = new Map<number, Entry>();
let nextId = 1;

export function pulseProbeMount(edgeId: string, remainingMs: number): number {
  const id = nextId++;
  live.set(id, {
    id, edgeId,
    mountWall: performance.now(),
    firstFrameWall: null, lastFrameWall: null,
    frameCount: 0,
    lastLocalT: 0, lastElapsed: 0, lastSwapStart: 0, lastSimNow: 0,
    remainingMs,
    rerunCount: 0,
    completed: false,
  });
  return id;
}

export function pulseProbeRerun(id: number, remainingMs: number): void {
  const e = live.get(id);
  if (!e) return;
  e.rerunCount++;
  e.remainingMs = remainingMs;
}

export function pulseProbeFrame(
  id: number,
  localT: number, elapsed: number, swapStart: number, simNow: number,
): void {
  const e = live.get(id);
  if (!e) return;
  const wall = performance.now();
  if (e.firstFrameWall === null) e.firstFrameWall = wall;
  e.lastFrameWall = wall;
  e.frameCount++;
  e.lastLocalT = localT;
  e.lastElapsed = elapsed;
  e.lastSwapStart = swapStart;
  e.lastSimNow = simNow;
}

export function pulseProbeUnmount(id: number, completed: boolean): void {
  const e = live.get(id);
  if (!e) return;
  e.completed = completed;
  live.delete(id);
}

let dumped = false;
let lastDumpText = "";
export function dumpPulseProbe(): void {
  if (dumped) return;
  dumped = true;
  const rows = [...live.values()].map((e) => ({
    edge: e.edgeId,
    id: e.id,
    ageMs: Math.round(performance.now() - e.mountWall),
    msSinceLastFrame: e.lastFrameWall ? Math.round(performance.now() - e.lastFrameWall) : null,
    frames: e.frameCount,
    rerun: e.rerunCount,
    localT: Number(e.lastLocalT.toFixed(4)),
    elapsed: Math.round(e.lastElapsed),
    remainingMs: Math.round(e.remainingMs),
    swapStart: Math.round(e.lastSwapStart),
    simNow: Math.round(e.lastSimNow),
    drift: Math.round(e.lastSimNow - e.lastSwapStart - e.lastElapsed),
  }));
  lastDumpText = formatRows(rows);
  // eslint-disable-next-line no-console
  console.warn("[stuck-pulse-probe] dump on stuck-anim:", rows);
  try {
    (window as unknown as { __pulseLeakDump?: unknown }).__pulseLeakDump = rows;
    if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(lastDumpText).catch(() => {});
  } catch {/* clipboard may be unavailable in webview */}
  try {
    const payload = { capturedAt: new Date().toISOString(), rows };
    // Lazy import to avoid pulling vscode-host shim into modules that
    // shouldn't depend on it during tests.
    void import("../../save").then(({ vscode }) => {
      vscode.postMessage({ type: "stuck-pulse-dump", json: JSON.stringify(payload, null, 2) });
    }).catch(() => {});
  } catch {/* host bridge may be unavailable */}
}

export function getPulseProbeDumpText(): string {
  return lastDumpText;
}

function formatRows(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "(no live pulses at stuck-anim)";
  const keys = Object.keys(rows[0]);
  const head = keys.join("\t");
  const body = rows.map((r) => keys.map((k) => String(r[k])).join("\t")).join("\n");
  return `${head}\n${body}`;
}
