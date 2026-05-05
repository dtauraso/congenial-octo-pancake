// Trace load/clear + drift summary. Host-message entry points
// (handleTraceLoaded / handleTraceError) are called from main.tsx
// when the extension posts trace-loaded / trace-error.

import { detectDrift, summarizeDrift } from "../../../sim/drift";
import { load as loadRunner, loadTrace, pause } from "../../../sim/runner";
import { initWorld, runUntil } from "../../../sim/simulator";
import { historyToTrace, parseTrace, type TraceEvent } from "../../../sim/trace";
import { vscode } from "../../save";
import { getSpec, patchTrace, setTrace } from "../../state";

export function clearTrace(): void {
  setTrace({ loaded: null, name: "", drift: "" });
  vscode.postMessage({ type: "trace-clear" });
  loadRunner(getSpec());
}

export function handleTraceLoaded(text: string, label: string): void {
  let events: TraceEvent[];
  try {
    events = parseTrace(text);
  } catch (err) {
    handleTraceError(err instanceof Error ? err.message : String(err));
    return;
  }
  const spec = getSpec();
  loadTrace(spec, events);
  pause();
  // Project the simulator's history to the same wire format and
  // compare. Bound the simulator at one step beyond the trace length
  // so a length-mismatch (sim ran longer) is detectable rather than
  // silently truncated.
  const recvCount = events.filter((e) => e.kind === "recv").length;
  const cap = recvCount + 1;
  let i = 0;
  const w = runUntil(
    spec,
    initWorld(spec),
    () => ++i > cap,
    Math.max(cap * 8, 1000),
  );
  const simProjection = historyToTrace(w.history, spec);
  const drift = summarizeDrift(detectDrift(events, simProjection));
  setTrace({ loaded: events, name: label, drift });
}

export function handleTraceError(message: string): void {
  patchTrace({ drift: `trace error: ${message}` });
}
