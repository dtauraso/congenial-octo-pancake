import * as vscode from "vscode";
import * as path from "path";
import * as cp from "child_process";
import * as crypto from "crypto";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      "topology.editor",
      new TopologyEditorProvider(context),
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );
}

class TopologyEditorProvider implements vscode.CustomTextEditorProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    panel: vscode.WebviewPanel
  ): Promise<void> {
    const outDir = vscode.Uri.file(path.join(this.context.extensionPath, "out"));
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [outDir],
    };
    panel.webview.html = this.html(panel.webview);

    let lastAppliedText: string | undefined;
    const send = () =>
      panel.webview.postMessage({ type: "load", text: document.getText() });

    const docSub = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) return;
      if (e.document.getText() === lastAppliedText) return;
      send();
    });

    const bundlePath = path.join(this.context.extensionPath, "out", "webview.js");
    const bundleWatcher = vscode.workspace.createFileSystemWatcher(bundlePath);
    const reload = () => {
      panel.webview.html = this.html(panel.webview);
    };
    bundleWatcher.onDidChange(reload);
    bundleWatcher.onDidCreate(reload);

    panel.onDidDispose(() => {
      docSub.dispose();
      bundleWatcher.dispose();
    });

    panel.webview.onDidReceiveMessage(async (msg) => {
      if (msg.type === "ready") {
        send();
      } else if (msg.type === "save") {
        lastAppliedText = msg.text;
        await applyEdit(document, msg.text);
        await document.save();
        runTopogen();
      }
    });
  }

  private html(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, "out", "webview.js"))
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, "out", "webview.css"))
    );
    const nonce = randomNonce();
    const csp = [
      `default-src 'none'`,
      `img-src ${webview.cspSource} data:`,
      `style-src ${webview.cspSource}`,
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
  <div class="toolbar"><span id="status" class="clean">saved</span></div>
  <div id="app"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

async function applyEdit(doc: vscode.TextDocument, text: string) {
  const edit = new vscode.WorkspaceEdit();
  const fullRange = new vscode.Range(
    doc.positionAt(0),
    doc.positionAt(doc.getText().length)
  );
  edit.replace(doc.uri, fullRange, text);
  await vscode.workspace.applyEdit(edit);
}

function runTopogen() {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) return;
  cp.exec("go run ./cmd/topogen", { cwd: folder.uri.fsPath }, (err, _o, stderr) => {
    if (err) {
      vscode.window.showErrorMessage(`topogen failed: ${stderr || err.message}`);
    }
  });
}

function randomNonce(): string {
  return crypto.randomBytes(24).toString("base64");
}
