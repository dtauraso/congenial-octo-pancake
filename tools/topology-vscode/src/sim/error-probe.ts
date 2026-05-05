// Runtime-error probe for the runner. Caught exceptions get pushed here
// AND to the console; the probe writes them to .probe/runner-errors-last.json
// so AI agents and CLI readers can diagnose without devtools. Mirrors the
// fold-halo and pulse-probe lifecycle (eager init, debounce dump).

type RunnerErrorEntry = {
  ts: number;
  source: "listener" | "stateListener" | "stepOnce";
  message: string;
  stack?: string;
  context?: unknown;
};

declare global {
  interface Window {
    __runnerErrorsLog?: RunnerErrorEntry[];
    __runnerErrorsDump?: () => number;
  }
}

let runnerErrorsDumpTimer: ReturnType<typeof setTimeout> | null = null;

function getVsCodeApi(): { postMessage(m: unknown): void } | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    __vscodeApi?: { postMessage(m: unknown): void };
  };
  return w.__vscodeApi ?? null;
}

function scheduleRunnerErrorsDump(): void {
  if (typeof window === "undefined") return;
  if (runnerErrorsDumpTimer !== null) clearTimeout(runnerErrorsDumpTimer);
  runnerErrorsDumpTimer = setTimeout(() => {
    runnerErrorsDumpTimer = null;
    window.__runnerErrorsDump?.();
  }, 250);
}

if (typeof window !== "undefined") {
  if (!window.__runnerErrorsLog) window.__runnerErrorsLog = [];
  window.__runnerErrorsDump = () => {
    const log = window.__runnerErrorsLog ?? [];
    const snapshot = log.slice();
    window.__runnerErrorsLog = [];
    const api = getVsCodeApi();
    if (api) {
      api.postMessage({
        type: "runner-errors-dump",
        json: JSON.stringify({ ts: Date.now(), entries: snapshot }, null, 2),
      });
    }
    return snapshot.length;
  };
}

export function reportRunnerError(
  source: RunnerErrorEntry["source"],
  err: unknown,
  context?: unknown,
): void {
  const e = err as { message?: unknown; stack?: unknown };
  const entry: RunnerErrorEntry = {
    ts: Date.now(),
    source,
    message: typeof e?.message === "string" ? e.message : String(err),
    stack: typeof e?.stack === "string" ? e.stack : undefined,
    context,
  };
  console.error(`runner ${source} threw:`, err);
  if (typeof window !== "undefined") {
    (window.__runnerErrorsLog ??= []).push(entry);
    scheduleRunnerErrorsDump();
  }
}
