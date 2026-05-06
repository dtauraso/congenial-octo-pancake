import { vscode } from "../../save";
import { state, liveSimTime } from "../../../sim/runner/_state";

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
  const rows = snapshotRows();
  lastDumpText = formatRows(rows);
  // eslint-disable-next-line no-console
  console.warn("[stuck-pulse-probe] dump on stuck-anim:", rows);
  try {
    (window as unknown as { __pulseLeakDump?: unknown }).__pulseLeakDump = rows;
    if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(lastDumpText).catch(() => {});
  } catch {/* clipboard may be unavailable in webview */}
  try {
    const payload = {
      capturedAt: new Date().toISOString(),
      runner: snapshotRunner(),
      rows,
    };
    vscode.postMessage({ type: "stuck-pulse-dump", json: JSON.stringify(payload, null, 2) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[stuck-pulse-probe] postMessage failed", err);
  }
  // Schedule a follow-up snapshot 1500ms later. If localT/elapsed values
  // haven't advanced, the sim clock is frozen. If they have, the pulses
  // are merely slow and the leak is elsewhere (e.g. completion path).
  setTimeout(() => dumpPulseProbeFollowup(), 1500);
  // And a third one ~30s later — by then the slow edge should have
  // long completed; if cycle hasn't advanced, the system genuinely
  // failed to restart and we have a real gating bug.
  setTimeout(() => dumpPulseProbeThird(), 30000);
}

function snapshotRows(): Array<Record<string, unknown>> {
  return [...live.values()].map((e) => ({
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
}

function snapshotRunner(): Record<string, unknown> {
  return {
    playing: state.playing,
    simAccumMs: state.simAccumMs,
    simSegmentStartWall: state.simSegmentStartWall,
    nowWall: performance.now(),
    liveSimTime: liveSimTime(),
    stepSimTime: state.stepSimTime,
    activeAnimations: state.activeAnimations,
    queueLen: state.world?.queue.length ?? null,
    pendingSeeds: state.world?.pendingSeeds.length ?? null,
    cycle: state.world?.cycle ?? null,
    tick: state.world?.tick ?? null,
    cycleRestartTimerSet: state.cycleRestartTimer !== null,
  };
}

function dumpPulseProbeThird(): void {
  const rows = snapshotRows();
  try {
    const payload = {
      capturedAt: new Date().toISOString(),
      delayMsAfterFirst: 30000,
      runner: snapshotRunner(),
      rows,
    };
    vscode.postMessage({ type: "stuck-pulse-third-dump", json: JSON.stringify(payload, null, 2) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[stuck-pulse-probe] third postMessage failed", err);
  }
}

function dumpPulseProbeFollowup(): void {
  const rows = snapshotRows();
  try {
    const payload = {
      capturedAt: new Date().toISOString(),
      delayMsAfterFirst: 1500,
      runner: snapshotRunner(),
      rows,
    };
    vscode.postMessage({ type: "stuck-pulse-followup-dump", json: JSON.stringify(payload, null, 2) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[stuck-pulse-probe] followup postMessage failed", err);
  }
}

// Allow the user/console to retry the dump even after the one-shot
// latch fired (e.g. when a reload didn't clear and we want a fresh
// snapshot). Resets the `dumped` flag so the next stuck-anim transition
// re-fires the file write.
export function resetPulseProbeLatch(): void {
  dumped = false;
}
try {
  (window as unknown as { __resetPulseLeak?: () => void }).__resetPulseLeak = resetPulseProbeLatch;
} catch {/* not in browser */}

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
