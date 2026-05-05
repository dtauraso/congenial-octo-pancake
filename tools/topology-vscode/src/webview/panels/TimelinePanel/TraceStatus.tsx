// Trace load/exit button + name label + drift summary.

import { vscode } from "../../save";
import type { TraceEvent } from "../../../sim/trace";
import { clearTrace } from "./trace-load";

type Props = {
  loadedTrace: readonly TraceEvent[] | null;
  name: string;
  drift: string;
};

export function TraceStatus({ loadedTrace, name, drift }: Props) {
  const onClick = () => {
    if (loadedTrace) clearTrace();
    else vscode.postMessage({ type: "trace-load" });
  };
  const driftClass = drift === ""
    ? ""
    : drift.startsWith("no drift") ? "ok" : "err";
  return (
    <>
      <button
        type="button"
        className="timeline-trace"
        title="load a *.trace.jsonl and replay it on this spec"
        onClick={onClick}
      >
        {loadedTrace ? "exit replay" : "load trace"}
      </button>
      <span className="timeline-trace-label">{loadedTrace ? name : ""}</span>
      <span className={"timeline-drift" + (driftClass ? " " + driftClass : "")}>
        {drift}
      </span>
    </>
  );
}
