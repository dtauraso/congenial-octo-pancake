// Step 7b host integration: lifecycle wrapper around runFrames behind
// the `topology.frameRendererEnabled` setting. Flag-off → never starts;
// legacy ticked renderer keeps serving. Flag-on → parses the document
// once on attach and on doc change, posts FrameMsg via the supplied
// sink. Parse errors are logged and swallowed so a malformed save
// doesn't tear down the editor.

import * as vscode from "vscode";
import type { TextDocument } from "vscode";
import type { HostToWebviewMsg } from "../messages";
import { parseSpec } from "../schema/parse-spec";
import { runFrames, type RunFramesHandle } from "../host-shim/run-frames";

const SETTING = "topology.frameRendererEnabled";

export interface FrameRendererCtl {
  refresh(): void;
  dispose(): void;
  pause(): void;
  resume(): void;
  step(): void;
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
    const enabled = vscode.workspace
      .getConfiguration()
      .get<boolean>(SETTING, false);
    if (!enabled) return;
    try {
      const spec = parseSpec(JSON.parse(document.getText()));
      handle = runFrames({ spec, post: (m) => post(m) });
    } catch (e) {
      console.warn("[topology] frame-renderer disabled — parse failed:", e);
    }
  };

  refresh();

  const cfgSub = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration(SETTING)) refresh();
  });

  return {
    refresh,
    dispose: () => {
      stop();
      cfgSub.dispose();
    },
    pause: () => handle?.pause(),
    resume: () => handle?.resume(),
    step: () => handle?.step(),
    get paused() { return handle?.paused ?? false; },
  };
}
