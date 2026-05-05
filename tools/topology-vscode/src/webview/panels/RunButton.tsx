import { createPortal } from "react-dom";
import { vscode } from "../save";
import { spec, useRunStatus } from "../state";
import { flushActiveInlineEdit } from "../inline-edit";

export function RunButton() {
  const status = useRunStatus();
  const mount = document.getElementById("run-mount");
  if (!mount) return null;
  const running = status.state === "running";
  const onRun = () => {
    if (running) {
      vscode.postMessage({ type: "run-cancel" });
      return;
    }
    // Commit any in-flight inline rename so the posted text reflects what
    // the user sees on screen, then bundle the spec into the run message
    // so the host writes topology.json synchronously before topogen runs.
    flushActiveInlineEdit();
    const text = JSON.stringify(spec, null, 2) + "\n";
    vscode.postMessage({ type: "run", text });
  };
  return createPortal(
    <>
      <button
        type="button"
        className="run-btn"
        title={running ? "stop the running process" : "go run . in repo root"}
        onClick={onRun}
      >
        {running ? "■ stop" : "▶ run"}
      </button>
      <span className={statusClass(status)}>{statusText(status)}</span>
    </>,
    mount,
  );
}

function statusClass(s: ReturnType<typeof useRunStatus>): string {
  if (s.state === "running") return "run-running";
  if (s.state === "ok") return "run-ok";
  if (s.state === "cancelled") return "run-idle";
  if (s.state === "error") return "run-error";
  return "run-idle";
}

function statusText(s: ReturnType<typeof useRunStatus>): string {
  if (s.state === "running") return "running…";
  if (s.state === "ok") return "ok";
  if (s.state === "cancelled") return "cancelled";
  if (s.state === "error") return s.message;
  return "";
}
