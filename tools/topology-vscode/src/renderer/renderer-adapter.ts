// Step 4 of the substrate iteration plan: renderer adapter. Subscribes
// to substrate state-change events (WireEvent | NodeEvent) and replays
// them at human-read speed, preserving order. Lives OUTSIDE substrate/
// because pacing belongs to the renderer per MODEL.md — the substrate
// is timing-free. Leaf module: no DOM, no React, no webview, no
// extension host. Pacing is the only responsibility; integration into
// a real renderer is a follow-up step. The clock is injectable so
// contract tests can drive time deterministically.

import type { PauseSignal } from "../substrate/pause-aware";

export interface RendererAdapter<E> {
  ingest(event: E): void;
  onPaced(listener: (event: E) => void): () => void;
  pending(): number;
  stop(): void;
}

export interface AdapterOptions {
  readonly delayMs: number;
  readonly schedule?: ScheduleFn;
  readonly pauseSignal?: PauseSignal;
}

export type ScheduleFn = (ms: number, fn: () => void) => () => void;

const defaultSchedule: ScheduleFn = (ms, fn) => {
  const t: ReturnType<typeof setTimeout> = setTimeout(fn, ms);
  return () => clearTimeout(t);
};

export function createRendererAdapter<E>(
  opts: AdapterOptions,
): RendererAdapter<E> {
  const queue: E[] = [];
  const listeners = new Set<(event: E) => void>();
  const schedule = opts.schedule ?? defaultSchedule;
  const pauseSignal = opts.pauseSignal;
  let cancel: (() => void) | null = null;
  let stopped = false;

  const pump = (): void => {
    if (stopped || cancel || queue.length === 0) return;
    if (pauseSignal?.paused) return;
    cancel = schedule(opts.delayMs, () => {
      cancel = null;
      if (stopped) return;
      if (pauseSignal?.paused) return;
      const event = queue.shift();
      if (event === undefined) return;
      for (const l of listeners) l(event);
      pump();
    });
  };

  if (pauseSignal) {
    void (async () => {
      while (!stopped) {
        await pauseSignal.awaitResume();
        pump();
        await pauseSignal.awaitPause().catch(() => {});
      }
    })();
  }

  return {
    ingest: (event) => {
      if (stopped) return;
      queue.push(event);
      pump();
    },
    onPaced: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    pending: () => queue.length,
    stop: () => {
      stopped = true;
      if (cancel) {
        cancel();
        cancel = null;
      }
    },
  };
}
