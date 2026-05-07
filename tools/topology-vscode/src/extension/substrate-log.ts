// Append-mode writer for substrate probe entries. Each call writes one
// JSON line to .probe/substrate-log.jsonl in the document's workspace
// folder. External readers can tail this file. Step 6 deletes this
// alongside the rest of the probe machinery.

import * as path from "path";
import * as vscode from "vscode";

const FILENAME = "substrate-log.jsonl";

export async function appendSubstrateLog(
  entry: string,
  documentUri: vscode.Uri,
): Promise<void> {
  const folder = vscode.workspace.getWorkspaceFolder(documentUri);
  const baseDir = folder ? folder.uri.fsPath : path.dirname(documentUri.fsPath);
  const dir = path.join(baseDir, ".probe");
  const file = path.join(dir, FILENAME);
  const fileUri = vscode.Uri.file(file);
  try {
    await vscode.workspace.fs.createDirectory(vscode.Uri.file(dir));
    let prior = "";
    try {
      const buf = await vscode.workspace.fs.readFile(fileUri);
      prior = new TextDecoder().decode(buf);
    } catch {
      // file doesn't exist yet
    }
    await vscode.workspace.fs.writeFile(
      fileUri,
      new TextEncoder().encode(prior + entry + "\n"),
    );
  } catch (err) {
    console.warn("topology editor: substrate-log append failed", err);
  }
}
