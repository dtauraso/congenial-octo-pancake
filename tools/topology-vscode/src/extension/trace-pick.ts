// Trace file picker: open a *.jsonl, decode as UTF-8, and post the
// resulting text + filename to the webview. On error, post a
// trace-error so the webview drift line surfaces it.

import * as path from "path";
import * as vscode from "vscode";
import type { HostToWebviewMsg } from "../messages";

export async function pickAndLoadTrace(
  documentUri: vscode.Uri,
  post: (msg: HostToWebviewMsg) => void,
): Promise<void> {
  const picked = await vscode.window.showOpenDialog({
    canSelectMany: false,
    openLabel: "Load trace",
    filters: { "Trace files": ["jsonl"] },
    defaultUri: documentUri,
  });
  if (!picked || picked.length === 0) return;
  const uri = picked[0];
  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    const text = new TextDecoder().decode(bytes);
    const label = path.basename(uri.fsPath);
    post({ type: "trace-loaded", text, label });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    post({ type: "trace-error", message });
  }
}
