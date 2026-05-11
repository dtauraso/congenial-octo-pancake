// Append-mode writer for webview log entries. One JSON line per call,
// written to .probe/webview-log.jsonl in the document's workspace
// folder. External readers tail this file to observe the webview
// without DevTools.
//
// Appends serialize through a single promise chain — concurrent bursts
// (boundary catch + window error firing for the same crash) would
// otherwise race on the read-then-write under vscode.workspace.fs.

import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";

const FILENAME = "webview-log.jsonl";

let pending: Promise<void> = Promise.resolve();

export async function appendWebviewLog(
  entry: string,
  documentUri: vscode.Uri,
): Promise<void> {
  pending = pending.then(() => doAppend(entry, documentUri));
  return pending;
}

async function doAppend(entry: string, documentUri: vscode.Uri): Promise<void> {
  const folder = vscode.workspace.getWorkspaceFolder(documentUri);
  const baseDir = folder ? folder.uri.fsPath : path.dirname(documentUri.fsPath);
  const dir = path.join(baseDir, ".probe");
  const file = path.join(dir, FILENAME);
  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.appendFile(file, entry + "\n", "utf8");
  } catch (err) {
    console.warn("topology editor: webview-log append failed", err);
  }
}
