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
import { appendWebviewLog } from "./webview-log";
import { toErrorMessage } from "../utils/error";

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
  const { document, sidecarUri, runner, post } = ctx;
  switch (msg.type) {
    case "ready":
      ctx.send();
      await ctx.sendView();
      return;
    case "save":
      try {
        ctx.setLastAppliedVersion(document.version + 1);
        await applyEdit(document, msg.text);
        await document.save();
        ctx.setLastAppliedVersion(document.version);
      } catch (err) {
        post({ type: "save-error", message: toErrorMessage(err) });
      }
      return;
    case "view-save":
      try { await writeSidecar(sidecarUri, msg.text); }
      catch (err) { post({ type: "save-error", message: toErrorMessage(err) }); }
      return;
    case "run":
      try {
        if (msg.text !== undefined) {
          ctx.setLastAppliedVersion(document.version + 1);
          await applyEdit(document, msg.text);
          await document.save();
          ctx.setLastAppliedVersion(document.version);
        }
      } catch (err) {
        console.error("topology editor: run pre-write failed", err);
        post({ type: "save-error", message: toErrorMessage(err) });
        return;
      }
      runner.run();
      return;
    case "run-cancel":
      runner.cancel();
      return;
    case "webview-log":
      await appendWebviewLog(msg.entry, document.uri);
      return;
  }
}
