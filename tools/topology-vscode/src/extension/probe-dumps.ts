// Persist a webview probe log to a workspace file so external readers
// (CLI, AI agents) can pick it up without devtools access. Anchored
// on the document's workspace folder, falling back to the document's
// directory if no folder is open.

import * as path from "path";
import * as vscode from "vscode";

type DumpType =
  | "pulse-probe-dump"
  | "fold-halo-dump"
  | "runner-errors-dump"
  | "timeline-dump";

const FILENAMES: Record<DumpType, string> = {
  "pulse-probe-dump": "pulse-last.json",
  "fold-halo-dump": "fold-halo-last.json",
  "runner-errors-dump": "runner-errors-last.json",
  "timeline-dump": "timeline-last.json",
};

export async function writeProbeDump(
  type: DumpType,
  json: string,
  documentUri: vscode.Uri,
): Promise<void> {
  const folder = vscode.workspace.getWorkspaceFolder(documentUri);
  const baseDir = folder ? folder.uri.fsPath : path.dirname(documentUri.fsPath);
  const dir = path.join(baseDir, ".probe");
  const file = path.join(dir, FILENAMES[type]);
  try {
    await vscode.workspace.fs.createDirectory(vscode.Uri.file(dir));
    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(file),
      new TextEncoder().encode(json),
    );
  } catch (err) {
    console.warn(`topology editor: ${type} write failed`, err);
  }
}
