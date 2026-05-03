import * as vscode from "vscode";
import * as path from "path";
import * as crypto from "crypto";
import { TopogenRunner } from "./topogenRunner";
import { BuildAndRunRunner } from "./runCommand";
import { viewSidecarUri, readSidecar, writeSidecar } from "./sidecar";

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

    const sidecarUri = viewSidecarUri(document.uri);
    const topogen = new TopogenRunner((status) =>
      panel.webview.postMessage({ type: "topogen-status", ...status })
    );
    const runner = new BuildAndRunRunner((status) =>
      panel.webview.postMessage({ type: "run-status", ...status })
    );

    // Suppress the `onDidChangeTextDocument` fire we trigger ourselves by
    // tracking the document version we last applied. Text-equality breaks on
    // no-op resaves (the same text fires a change event whose version bumps);
    // version comparison handles those correctly.
    let lastAppliedVersion = document.version;
    const send = () =>
      panel.webview.postMessage({ type: "load", text: document.getText() });

    const sendView = async () => {
      const text = await readSidecar(sidecarUri);
      panel.webview.postMessage({ type: "view-load", text });
    };

    const docSub = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) return;
      if (e.document.version <= lastAppliedVersion) return;
      send();
    });

    const viewStateSub = panel.onDidChangeViewState(() => {
      if (!panel.visible) {
        panel.webview.postMessage({ type: "flush" });
      }
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
      viewStateSub.dispose();
      topogen.dispose();
      runner.dispose();
    });

    panel.webview.onDidReceiveMessage(async (msg) => {
      if (msg.type === "ready") {
        send();
        await sendView();
      } else if (msg.type === "save") {
        try {
          // Bump the suppression watermark synchronously before applyEdit so
          // the change event (which fires before applyEdit's promise resolves)
          // is filtered by docSub.
          lastAppliedVersion = document.version + 1;
          await applyEdit(document, msg.text);
          await document.save();
          // Re-sync in case the actual post-edit version diverged.
          lastAppliedVersion = document.version;
          topogen.schedule();
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          panel.webview.postMessage({ type: "save-error", message });
        }
      } else if (msg.type === "view-save") {
        try {
          await writeSidecar(sidecarUri, msg.text);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          panel.webview.postMessage({ type: "save-error", message });
        }
      } else if (msg.type === "run") {
        try {
          await topogen.write();
        } catch {
          return; // topogen already surfaced the error; don't spawn go run.
        }
        runner.run();
      } else if (msg.type === "run-cancel") {
        runner.cancel();
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
  <div class="toolbar">
    <span id="status" class="clean">saved</span>
    <span id="topogen-status" class="topogen-ok" title="generated Go is up to date">codegen ✓</span>
    <button id="run-btn" class="run-btn" title="go run . in repo root">▶ run</button>
    <span id="run-status" class="run-idle"></span>
  </div>
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

function randomNonce(): string {
  return crypto.randomBytes(24).toString("base64");
}
