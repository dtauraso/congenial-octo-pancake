import { spec, viewerState } from "./state";
import { serializeViewerState } from "./viewerState";
import type { TopogenStatus, WebviewToHostMsg } from "../messages";

export type { TopogenStatus };

declare function acquireVsCodeApi(): {
  postMessage(msg: WebviewToHostMsg): void;
  setState(s: unknown): void;
  getState(): unknown;
};

export const vscode = acquireVsCodeApi();
const status = document.getElementById("status")!;
const topogenStatus = document.getElementById("topogen-status")!;

let lastSyncedText: string | undefined;
let lastViewSyncedText: string | undefined;

// Debounced timing lives in <SaveLifecycle /> (useDebouncedCallback).
// schedule()/flush() bridge module-level callers to the component's
// debouncer; null until the component mounts.
type Saver = { schedule: () => void; flush: () => void };
let saveImpl: Saver | null = null;
let viewSaveImpl: Saver | null = null;

export function registerSavers(save: Saver, viewSave: Saver) {
  saveImpl = save;
  viewSaveImpl = viewSave;
}

export function postReady() {
  vscode.postMessage({ type: "ready" });
}

export function isSynced(text: string): boolean {
  return text === lastSyncedText;
}

export function markSynced(text: string) {
  lastSyncedText = text;
}

export function setStatus(dirty: boolean) {
  status.textContent = dirty ? "saving…" : "saved";
  status.className = dirty ? "dirty" : "clean";
}

export function setTopogenStatus(s: TopogenStatus) {
  if (s.state === "running") {
    topogenStatus.textContent = "codegen …";
    topogenStatus.className = "topogen-running";
    topogenStatus.title = "regenerating Go";
  } else if (s.state === "ok") {
    topogenStatus.textContent = "codegen ✓";
    topogenStatus.className = "topogen-ok";
    topogenStatus.title = "generated Go is up to date";
  } else {
    topogenStatus.textContent = "codegen ✗";
    topogenStatus.className = "topogen-error";
    topogenStatus.title = s.message;
  }
}

// Pure send-now helpers — invoked by the debouncer in <SaveLifecycle />
// after the trailing edge fires, or directly via flushSave/flushViewSave.
export function performSave() {
  const text = JSON.stringify(spec, null, 2) + "\n";
  lastSyncedText = text;
  vscode.postMessage({ type: "save", text });
  setStatus(false);
}

export function performViewSave() {
  const text = serializeViewerState(viewerState);
  if (text === lastViewSyncedText) return;
  lastViewSyncedText = text;
  vscode.postMessage({ type: "view-save", text });
}

export function scheduleSave() {
  setStatus(true);
  saveImpl?.schedule();
}

export function flushSave() {
  saveImpl?.flush();
}

export function scheduleViewSave() {
  viewSaveImpl?.schedule();
}

export function flushViewSave() {
  viewSaveImpl?.flush();
}

export function markViewSynced(text: string) {
  lastViewSyncedText = text;
}
