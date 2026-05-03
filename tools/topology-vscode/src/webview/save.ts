import { spec } from "./state";

declare function acquireVsCodeApi(): {
  postMessage(msg: unknown): void;
  setState(s: unknown): void;
  getState(): unknown;
};

const vscode = acquireVsCodeApi();
const status = document.getElementById("status")!;

let saveTimer: number | undefined;
let lastSyncedText: string | undefined;

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

window.addEventListener("pagehide", flushSave);
window.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushSave();
});
