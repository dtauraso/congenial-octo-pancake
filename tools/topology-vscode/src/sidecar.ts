import * as vscode from "vscode";
import * as path from "path";

export function viewSidecarUri(docUri: vscode.Uri): vscode.Uri {
  const p = docUri.fsPath;
  const ext = path.extname(p);
  const base = ext ? p.slice(0, -ext.length) : p;
  return vscode.Uri.file(`${base}.view.json`);
}

export async function readSidecar(uri: vscode.Uri): Promise<string | undefined> {
  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(bytes).toString("utf8");
  } catch {
    return undefined;
  }
}

export async function writeSidecar(uri: vscode.Uri, text: string): Promise<void> {
  await vscode.workspace.fs.writeFile(uri, Buffer.from(text, "utf8"));
}
