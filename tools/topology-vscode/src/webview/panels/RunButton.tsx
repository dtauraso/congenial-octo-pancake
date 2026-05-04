import { createPortal } from "react-dom";
import { vscode } from "../save";
import { useRunStatus } from "../state";

export function RunButton() {
  const status = useRunStatus();
  const mount = document.getElementById("run-mount");
  if (!mount) return null;
  const running = status.state === "running";
  return createPortal(
    <>
      <button
        type="button"
        className="run-btn"
        title={running ? "stop the running process" : "go run . in repo root"}
        onClick={() => vscode.postMessage({ type: running ? "run-cancel" : "run" })}
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
