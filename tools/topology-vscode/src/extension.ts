import * as vscode from "vscode";
import * as path from "path";
import * as crypto from "crypto";
import { TopogenRunner } from "./topogenRunner";
import { BuildAndRunRunner } from "./runCommand";
import { viewSidecarUri, readSidecar, writeSidecar } from "./sidecar";
import { loadFileVersion, loadHeadVersion } from "./compareLoader";
import { parseWebviewToHost, type HostToWebviewMsg } from "./messages";

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
    const post = (msg: HostToWebviewMsg) => panel.webview.postMessage(msg);
    const topogen = new TopogenRunner((status) =>
      post({ type: "topogen-status", ...status })
    );
    const runner = new BuildAndRunRunner((status) =>
      post({ type: "run-status", ...status })
    );

    // Suppress the `onDidChangeTextDocument` fire we trigger ourselves by
    // tracking the document version we last applied. Text-equality breaks on
    // no-op resaves (the same text fires a change event whose version bumps);
    // version comparison handles those correctly.
    let lastAppliedVersion = document.version;
    const send = () =>
      post({ type: "load", text: document.getText() });

    const sendView = async () => {
      const text = await readSidecar(sidecarUri);
      post({ type: "view-load", text });
    };

    const docSub = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) return;
      if (e.document.version <= lastAppliedVersion) return;
      send();
    });

    const viewStateSub = panel.onDidChangeViewState(() => {
      if (!panel.visible) {
        post({ type: "flush" });
      }
    });

    // Hot-reload of the webview bundle is a dev-loop convenience. The
    // GlobPattern an absolute path produces only matches paths inside the
    // workspace, so it silently never fires for installed users; gate the
    // watcher on the extension mode rather than relying on that quirk.
    const bundleWatcher =
      this.context.extensionMode === vscode.ExtensionMode.Development
        ? vscode.workspace.createFileSystemWatcher(
            path.join(this.context.extensionPath, "out", "webview.js")
          )
        : undefined;
    if (bundleWatcher) {
      const reload = () => {
        panel.webview.html = this.html(panel.webview);
      };
      bundleWatcher.onDidChange(reload);
      bundleWatcher.onDidCreate(reload);
    }

    // Push everything into context.subscriptions immediately so an
    // activation failure between creation and panel.onDidDispose can't
    // leak watchers / processes. dispose() is idempotent on the VS Code
    // disposables we use here, so the panel.onDidDispose path below is
    // safe to keep for eager release per-panel.
    this.context.subscriptions.push(docSub, viewStateSub, topogen, runner);
    if (bundleWatcher) this.context.subscriptions.push(bundleWatcher);

    panel.onDidDispose(() => {
      docSub.dispose();
      bundleWatcher?.dispose();
      viewStateSub.dispose();
      topogen.dispose();
      runner.dispose();
    });

    panel.webview.onDidReceiveMessage(async (raw: unknown) => {
      const msg = parseWebviewToHost(raw);
      if (!msg) {
        console.warn("topology editor: ignoring malformed webview message", raw);
        return;
      }
      switch (msg.type) {
        case "ready":
          send();
          await sendView();
          return;
        case "save":
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
            post({ type: "save-error", message });
          }
          return;
        case "view-save":
          try {
            await writeSidecar(sidecarUri, msg.text);
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            post({ type: "save-error", message });
          }
          return;
        case "run":
          try {
            await topogen.write();
          } catch {
            return; // topogen already surfaced the error; don't spawn go run.
          }
          runner.run();
          return;
        case "run-cancel":
          runner.cancel();
          return;
        case "compare-head": {
          const result = await loadHeadVersion(document.uri);
          post(
            result.ok
              ? { type: "compare-load", source: result.source, text: result.text, label: result.label }
              : { type: "compare-error", source: result.source, message: result.message }
          );
          return;
        }
        case "compare-file": {
          const result = await loadFileVersion(document.uri);
          if (!result) return; // user cancelled the picker
          post(
            result.ok
              ? { type: "compare-load", source: result.source, text: result.text, label: result.label }
              : { type: "compare-error", source: result.source, message: result.message }
          );
          return;
        }
        case "trace-load": {
          const picked = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: "Load trace",
            filters: { "Trace files": ["jsonl"] },
            defaultUri: document.uri,
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
          return;
        }
        case "trace-clear":
          // Pure UI action — webview clears its own trace state. No host
          // work needed; included in the message vocab so the user-side
          // log is uniform with trace-load.
          return;
        case "pulse-probe-dump":
        case "fold-halo-dump":
        case "runner-errors-dump":
        case "timeline-dump": {
          // Persist a webview probe log to a workspace file so external
          // readers (CLI, AI agents) can pick it up without devtools access.
          // Anchored on the document's workspace folder, falling back to
          // the document's directory if no folder is open.
          const folder = vscode.workspace.getWorkspaceFolder(document.uri);
          const baseDir = folder
            ? folder.uri.fsPath
            : path.dirname(document.uri.fsPath);
          const dir = path.join(baseDir, ".probe");
          const fname =
            msg.type === "pulse-probe-dump" ? "pulse-last.json" :
            msg.type === "fold-halo-dump" ? "fold-halo-last.json" :
            msg.type === "timeline-dump" ? "timeline-last.json" :
            "runner-errors-last.json";
          const file = path.join(dir, fname);
          try {
            await vscode.workspace.fs.createDirectory(vscode.Uri.file(dir));
            await vscode.workspace.fs.writeFile(
              vscode.Uri.file(file),
              new TextEncoder().encode(msg.json)
            );
          } catch (err) {
            console.warn(`topology editor: ${msg.type} write failed`, err);
          }
          return;
        }
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
    // React Flow positions every node via inline `style="transform: ..."`
    // attributes, which `style-src` governs when `style-src-attr` is unset.
    // The bundled stylesheet is still served from cspSource; 'unsafe-inline'
    // is the minimal additional grant needed for RF to lay nodes out. The
    // webview is a controlled iframe with no third-party content, so the
    // XSS-via-stylesheet surface is negligible.
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
