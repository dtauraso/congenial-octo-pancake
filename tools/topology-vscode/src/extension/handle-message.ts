// Message handler for one webview panel. The closure-captured state
// (lastAppliedVersion ref, topogen/runner instances, post callback,
// sidecar URI) is passed in via the Ctx struct so this stays a plain
// function rather than a method.

import * as vscode from "vscode";
import { TopogenRunner } from "../topogenRunner";
import { BuildAndRunRunner } from "../runCommand";
import { writeSidecar } from "../sidecar";
import { parseWebviewToHost, type HostToWebviewMsg, type WebviewToHostMsg } from "../messages";
import { applyEdit } from "./html";
import { writeProbeDump } from "./probe-dumps";
import { pickAndLoadTrace } from "./trace-pick";
import { handleCompareFile, handleCompareHead } from "./compare-load";

export type MessageCtx = {
  document: vscode.TextDocument;
  sidecarUri: vscode.Uri;
  topogen: TopogenRunner;
  runner: BuildAndRunRunner;
  post: (msg: HostToWebviewMsg) => Thenable<boolean>;
  send: () => Thenable<boolean>;
  sendView: () => Promise<unknown>;
  setLastAppliedVersion: (v: number) => void;
};

export async function handleMessage(raw: unknown, ctx: MessageCtx): Promise<void> {
  const msg = parseWebviewToHost(raw);
  if (!msg) {
    console.warn("topology editor: ignoring malformed webview message", raw);
    return;
  }
  await dispatch(msg, ctx);
}

async function dispatch(msg: WebviewToHostMsg, ctx: MessageCtx): Promise<void> {
  const { document, sidecarUri, topogen, runner, post } = ctx;
  switch (msg.type) {
    case "ready":
      ctx.send();
      await ctx.sendView();
      return;
    case "save":
      try {
        // Bump suppression watermark synchronously before applyEdit so
        // the change event (fires before applyEdit's promise resolves)
        // is filtered by docSub.
        ctx.setLastAppliedVersion(document.version + 1);
        await applyEdit(document, msg.text);
        await document.save();
        ctx.setLastAppliedVersion(document.version);
        topogen.schedule();
      } catch (err) {
        post({ type: "save-error", message: errMsg(err) });
      }
      return;
    case "view-save":
      try { await writeSidecar(sidecarUri, msg.text); }
      catch (err) { post({ type: "save-error", message: errMsg(err) }); }
      return;
    case "run":
      try {
        // If the webview bundled the latest spec text, persist it before
        // codegen so an in-flight inline edit (or a still-debounced save)
        // can't leave topology.json one rename behind the editor view.
        if (msg.text !== undefined) {
          ctx.setLastAppliedVersion(document.version + 1);
          await applyEdit(document, msg.text);
          await document.save();
          ctx.setLastAppliedVersion(document.version);
        }
        await topogen.write();
      } catch { return; }
      runner.run();
      return;
    case "run-cancel":
      runner.cancel();
      return;
    case "compare-head":
      await handleCompareHead(document.uri, post);
      return;
    case "compare-file":
      await handleCompareFile(document.uri, post);
      return;
    case "trace-load":
      await pickAndLoadTrace(document.uri, post);
      return;
    case "trace-clear":
      return;
    case "pulse-probe-dump":
    case "stuck-pulse-dump":
    case "stuck-pulse-followup-dump":
    case "stuck-pulse-third-dump":
    case "fold-halo-dump":
    case "runner-errors-dump":
    case "timeline-dump":
      await writeProbeDump(msg.type, msg.json, document.uri);
      return;
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
