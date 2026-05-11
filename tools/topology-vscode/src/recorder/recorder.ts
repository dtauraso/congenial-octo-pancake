// Step 5 of the substrate iteration plan: recorder. A second leaf
// subscriber over the substrate's state-change event stream
// (WireEvent | NodeEvent), independent from the renderer adapter.
// Appends events to an in-memory log for replay / scrub / bug repro.
// Lives outside src/substrate/ — substrate is timing-free per
// MODEL.md, and the recorder is not a substrate concern. No pacing,
// no DOM, no extension host. Mirrors the adapter shape so a single
// emitter can fan out to renderer + recorder + anything else.

export interface Recorder<E> {
  ingest(event: E): void;
  snapshot(): readonly E[];
  length(): number;
  clear(): void;
  stop(): void;
}

export function createRecorder<E>(): Recorder<E> {
  const log: E[] = [];
  let stopped = false;
  return {
    ingest: (event) => {
      if (stopped) return;
      log.push(event);
    },
    snapshot: () => log.slice(),
    length: () => log.length,
    clear: () => {
      log.length = 0;
    },
    stop: () => {
      stopped = true;
    },
  };
}
