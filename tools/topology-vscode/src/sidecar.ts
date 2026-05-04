import * as vscode from "vscode";

// Compute the sidecar URI by operating on the URI path (forward slashes,
// scheme-agnostic) instead of round-tripping through fsPath, which on
// Windows uses backslashes and only works for the file: scheme.
export function viewSidecarUri(docUri: vscode.Uri): vscode.Uri {
  const lastSlash = docUri.path.lastIndexOf("/");
  const dir = lastSlash >= 0 ? docUri.path.slice(0, lastSlash) : "";
  const base = lastSlash >= 0 ? docUri.path.slice(lastSlash + 1) : docUri.path;
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  return docUri.with({ path: `${dir}/${stem}.view.json` });
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
