// Build-and-run button. Clicking sends {type: "run"} to the extension, which
// spawns `go run .` and streams output to a VS Code OutputChannel. While
// running, the button becomes "■ stop" and re-clicking cancels the process.

import { vscode } from "./save";

export type RunStatus =
  | { state: "running" }
  | { state: "ok" }
  | { state: "error"; message: string }
  | { state: "cancelled" };

let running = false;

export function initRunButton() {
  const btn = document.getElementById("run-btn") as HTMLButtonElement | null;
  const status = document.getElementById("run-status");
  if (!btn || !status) return;
  btn.addEventListener("click", () => {
    if (running) vscode.postMessage({ type: "run-cancel" });
    else vscode.postMessage({ type: "run" });
  });
}

export function setRunStatus(s: RunStatus) {
  const btn = document.getElementById("run-btn") as HTMLButtonElement | null;
  const status = document.getElementById("run-status");
  if (!btn || !status) return;
  if (s.state === "running") {
    running = true;
    btn.textContent = "■ stop";
    btn.title = "stop the running process";
    status.className = "run-running";
    status.textContent = "running…";
  } else {
    running = false;
    btn.textContent = "▶ run";
    btn.title = "go run . in repo root";
    if (s.state === "ok") {
      status.className = "run-ok";
      status.textContent = "ok";
    } else if (s.state === "cancelled") {
      status.className = "run-idle";
      status.textContent = "cancelled";
    } else {
      status.className = "run-error";
      status.textContent = s.message;
    }
  }
}
