import { spec, view, viewerState } from "./state";
import { serializeViewerState } from "./viewerState";

declare function acquireVsCodeApi(): {
  postMessage(msg: unknown): void;
  setState(s: unknown): void;
  getState(): unknown;
};

export const vscode = acquireVsCodeApi();
const status = document.getElementById("status")!;
const topogenStatus = document.getElementById("topogen-status")!;

let saveTimer: number | undefined;
let viewSaveTimer: number | undefined;
let lastSyncedText: string | undefined;
let lastViewSyncedText: string | undefined;

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

export type TopogenStatus =
  | { state: "running" }
  | { state: "ok" }
  | { state: "error"; message: string };

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

export function scheduleSave() {
  setStatus(true);
  if (saveTimer !== undefined) clearTimeout(saveTimer);
  saveTimer = window.setTimeout(flushSave, 250);
}

export function flushSave() {
  if (saveTimer === undefined) return;
  clearTimeout(saveTimer);
  saveTimer = undefined;
  const text = JSON.stringify(spec, null, 2) + "\n";
  lastSyncedText = text;
  vscode.postMessage({ type: "save", text });
  setStatus(false);
}

export function scheduleViewSave() {
  if (viewSaveTimer !== undefined) clearTimeout(viewSaveTimer);
  viewSaveTimer = window.setTimeout(flushViewSave, 400);
}

export function flushViewSave() {
  if (viewSaveTimer === undefined) return;
  clearTimeout(viewSaveTimer);
  viewSaveTimer = undefined;
  viewerState.camera = { x: view.x, y: view.y, w: view.w, h: view.h };
  const text = serializeViewerState(viewerState);
  if (text === lastViewSyncedText) return;
  lastViewSyncedText = text;
  vscode.postMessage({ type: "view-save", text });
}

export function markViewSynced(text: string) {
  lastViewSyncedText = text;
}

window.addEventListener("pagehide", () => { flushSave(); flushViewSave(); });
window.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") { flushSave(); flushViewSave(); }
});
