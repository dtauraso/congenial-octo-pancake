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

// Route writes through a TextDocument + WorkspaceEdit so an open editor on
// the sidecar isn't clobbered by a raw fs.writeFile. Falls back to fs.writeFile
// when the file doesn't exist yet (openTextDocument on a missing path would
// require pre-creation in the editor model).
export async function writeSidecar(uri: vscode.Uri, text: string): Promise<void> {
  let doc: vscode.TextDocument | undefined;
  try {
    doc = await vscode.workspace.openTextDocument(uri);
  } catch {
    await vscode.workspace.fs.writeFile(uri, Buffer.from(text, "utf8"));
    return;
  }
  if (doc.getText() === text) return;
  const edit = new vscode.WorkspaceEdit();
  const fullRange = new vscode.Range(
    doc.positionAt(0),
    doc.positionAt(doc.getText().length)
  );
  edit.replace(uri, fullRange, text);
  await vscode.workspace.applyEdit(edit);
  await doc.save();
}
