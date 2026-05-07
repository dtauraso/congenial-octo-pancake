// Append-mode writer for substrate probe entries. Each call writes one
// JSON line to .probe/substrate-log.jsonl in the document's workspace
// folder. External readers can tail this file. Step 6 deletes this
// alongside the rest of the probe machinery.

import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";

const FILENAME = "substrate-log.jsonl";

// Serialize appends so concurrent log calls don't drop entries (the
// vscode.workspace.fs read-then-write pattern races on bursty traffic
// like the substrate's per-emit logs).
let pending: Promise<void> = Promise.resolve();

export async function appendSubstrateLog(
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
    console.warn("topology editor: substrate-log append failed", err);
  }
}
