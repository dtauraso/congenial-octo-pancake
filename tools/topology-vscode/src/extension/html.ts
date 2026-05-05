// Webview HTML template + CSP + nonce generation. Kept separate from
// the editor provider so the provider's wiring stays readable.

import * as crypto from "crypto";
import * as path from "path";
import * as vscode from "vscode";

export function buildWebviewHtml(
  webview: vscode.Webview,
  extensionPath: string,
): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.file(path.join(extensionPath, "out", "webview.js")),
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.file(path.join(extensionPath, "out", "webview.css")),
  );
  const nonce = randomNonce();
  // React Flow positions every node via inline `style="transform: ..."`
  // attributes, which `style-src` governs when `style-src-attr` is unset.
  // The bundled stylesheet is still served from cspSource; 'unsafe-inline'
  // is the minimal additional grant needed for RF to lay nodes out.
  const csp = [
    `default-src 'none'`,
    `img-src ${webview.cspSource} data:`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${nonce}'`,
    `font-src ${webview.cspSource}`,
  ].join("; ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <title>Topology Editor</title>
  <link rel="stylesheet" href="${styleUri}" />
</head>
<body>
  <div class="toolbar">
    <span id="status" class="clean">saved</span>
    <span id="topogen-status" class="topogen-ok" title="generated Go is up to date">codegen ✓</span>
    <span id="run-mount"></span>
  </div>
  <div id="app"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function randomNonce(): string {
  return crypto.randomBytes(24).toString("base64");
}

export async function applyEdit(
  doc: vscode.TextDocument,
  text: string,
): Promise<void> {
  const edit = new vscode.WorkspaceEdit();
  const fullRange = new vscode.Range(
    doc.positionAt(0),
    doc.positionAt(doc.getText().length),
  );
  edit.replace(doc.uri, fullRange, text);
  await vscode.workspace.applyEdit(edit);
}
