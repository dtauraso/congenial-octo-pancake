// Fixed-size ring buffer for timeline entries. Push is one bounds-
// checked write — no array growth, no shift, no allocation beyond
// the entry object itself. Hot-path: O(1) per event.

import type { TimelineEntry } from "./types";

export const MAX_ENTRIES = 2000;
export const DUMP_DEBOUNCE_MS = 500;
export const HEARTBEAT_MS = 5000;

const ring: Array<TimelineEntry | null> = new Array(MAX_ENTRIES).fill(null);
let writeIdx = 0;
let entryCount = 0;
let dirtySinceDump = false;

export function probeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (window.__timelineProbe === false) return false;
  return true;
}

export function push(entry: TimelineEntry): void {
  if (!probeEnabled()) return;
  ring[writeIdx] = entry;
  writeIdx = (writeIdx + 1) % MAX_ENTRIES;
  if (entryCount < MAX_ENTRIES) entryCount++;
  dirtySinceDump = true;
  scheduleDump();
}

export function snapshot(): TimelineEntry[] {
  if (entryCount < MAX_ENTRIES) {
    return ring
      .slice(0, entryCount)
      .filter((e): e is TimelineEntry => e !== null);
  }
  // Wrapped — read from writeIdx forward, then 0..writeIdx.
  const out: TimelineEntry[] = [];
  for (let i = 0; i < MAX_ENTRIES; i++) {
    const e = ring[(writeIdx + i) % MAX_ENTRIES];
    if (e) out.push(e);
  }
  return out;
}

export function clearRing(): void {
  ring.fill(null);
  writeIdx = 0;
  entryCount = 0;
}

export function isDirty(): boolean {
  return dirtySinceDump;
}

export function markClean(): void {
  dirtySinceDump = false;
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
