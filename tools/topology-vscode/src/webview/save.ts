import { spec, viewerState } from "./state";
import { serializeViewerState } from "./state/viewer/types";
import type { TopogenStatus } from "../messages";
import { vscode } from "./vscode-api";

export type { TopogenStatus };
const status = document.getElementById("status")!;
const topogenStatus = document.getElementById("topogen-status")!;

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
  vscode.postMessage({ type: "save", text });
  setStatus(false);
}

export function performViewSave() {
  // Race guard: until view-load has been processed (markViewSynced called),
  // viewerState lacks the persisted nodes/edges from the sidecar. Saving in
  // that window serializes empty {nodes,edges} and clobbers the file on
  // disk. See task/view-load-race-guard.
  if (lastViewSyncedText === undefined) return;
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
  if (lastViewSyncedText === undefined) return;
  viewSaveImpl?.schedule();
}

export function flushViewSave() {
  viewSaveImpl?.flush();
}

export function markViewSynced(text: string) {
  lastViewSyncedText = text;
}
