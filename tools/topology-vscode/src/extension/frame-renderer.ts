// Host integration: lifecycle wrapper around runFrames. Parses the
// document on attach and on doc change, posts FrameMsg via the supplied
// sink. Parse errors are logged and swallowed so a malformed save
// doesn't tear down the editor.

import type { TextDocument } from "vscode";
import type { HostToWebviewMsg } from "../messages";
import { parseSpec } from "../schema/parse-spec";
import { runFrames, type RunFramesHandle } from "../host-shim/run-frames";

export interface FrameRendererCtl {
  refresh(): void;
  dispose(): void;
  pause(): void;
  resume(): void;
  step(): void;
  markArrived(wireId: string): void;
  clearWire(wireId: string): void;
  readonly paused: boolean;
}

export function attachFrameRenderer(
  document: TextDocument,
  post: (msg: HostToWebviewMsg) => void,
): FrameRendererCtl {
  let handle: RunFramesHandle | undefined;

  const stop = (): void => {
    handle?.stop();
    handle = undefined;
  };

  const refresh = (): void => {
    stop();
    try {
      const spec = parseSpec(JSON.parse(document.getText()));
      handle = runFrames({ spec, post: (m) => post(m) });
    } catch (e) {
      console.warn("[topology] frame-renderer disabled — parse failed:", e);
    }
  };

  refresh();

  return {
    refresh,
    dispose: stop,
    pause: () => handle?.pause(),
    resume: () => handle?.resume(),
    step: () => handle?.step(),
    markArrived: (wireId: string) => handle?.markArrived(wireId),
    clearWire: (wireId: string) => handle?.clearWire(wireId),
    get paused() { return handle?.paused ?? false; },
  };
}
